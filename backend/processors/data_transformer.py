"""Data cleaning, transformation, statistical analysis, and validation using Pandas."""
import io
import re
from typing import List, Dict, Any, Tuple, Optional
import pandas as pd
import numpy as np

from backend.models import ExtractedTable, TableStatistics, TableTransformRequest


class PandasDataProcessor:
    """Enterprise table transformer and statistical engine built on Pandas."""

    @staticmethod
    def table_to_dataframe(table: ExtractedTable) -> pd.DataFrame:
        """Construct a clean Pandas DataFrame from ExtractedTable schema."""
        if not table.rows:
            return pd.DataFrame(columns=table.headers)

        df = pd.DataFrame(table.rows, columns=table.headers)
        return df

    @staticmethod
    def dataframe_to_table(df: pd.DataFrame, table_id: str, page_number: int, strategy: str = "lattice") -> ExtractedTable:
        """Convert a Pandas DataFrame back to an ExtractedTable object."""
        # Replace NaN with empty strings or None for JSON serialization
        clean_df = df.replace({np.nan: None})
        headers = [str(c) for c in clean_df.columns]
        rows = clean_df.values.tolist()

        return ExtractedTable(
            table_id=table_id,
            page_number=page_number,
            headers=headers,
            rows=rows,
            row_count=len(rows),
            col_count=len(headers),
            extraction_strategy=strategy,
            confidence_score=1.0
        )

    def transform_table(self, table: ExtractedTable, request: TableTransformRequest) -> Tuple[ExtractedTable, TableStatistics]:
        """Apply sequential Pandas transformation pipelines based on user specifications."""
        df = self.table_to_dataframe(table)

        # 1. Clean whitespace
        if request.trim_whitespace:
            df = df.map(lambda x: str(x).strip() if x is not None and not pd.isna(x) else x)

        # 2. Promote specific header row if requested
        if request.header_row_index > 0 and len(df) > request.header_row_index:
            new_headers = [str(c) if c else f"Col_{i+1}" for i, c in enumerate(df.iloc[request.header_row_index - 1])]
            df = df.iloc[request.header_row_index:].reset_index(drop=True)
            df.columns = new_headers

        # 3. Drop fully empty rows
        if request.drop_empty_rows:
            # Replace whitespace-only strings with NA temporarily
            temp_df = df.replace(r"^\s*$", np.nan, regex=True)
            df = df.loc[temp_df.dropna(how="all").index].reset_index(drop=True)

        # 4. Drop fully empty columns
        if request.drop_empty_cols:
            temp_df = df.replace(r"^\s*$", np.nan, regex=True)
            valid_cols = temp_df.dropna(axis=1, how="all").columns
            df = df[valid_cols]

        # 5. Type inference and cleaning
        if request.infer_numeric_types:
            df = self._auto_infer_and_cast(df)

        # 6. Filtering
        if request.filter_column and request.filter_query and request.filter_column in df.columns:
            query = str(request.filter_query).strip()
            series = df[request.filter_column].astype(str)
            # Case-insensitive substring match
            mask = series.str.contains(query, case=False, na=False)
            df = df[mask].reset_index(drop=True)

        # 7. Sorting
        if request.sort_column and request.sort_column in df.columns:
            df = df.sort_values(by=request.sort_column, ascending=request.sort_ascending).reset_index(drop=True)

        # 8. Compute Statistics
        stats = self.compute_statistics(df)

        transformed_table = self.dataframe_to_table(
            df,
            table_id=table.table_id,
            page_number=table.page_number,
            strategy=table.extraction_strategy
        )

        return transformed_table, stats

    def _auto_infer_and_cast(self, df: pd.DataFrame) -> pd.DataFrame:
        """Infer numeric columns, stripping common currency signs and grouping commas."""
        result_df = df.copy()

        for col in result_df.columns:
            series = result_df[col].astype(str).str.strip()
            # Test if stripping $, €, £, and commas produces clean numbers
            cleaned_num_series = series.str.replace(r"[$€£¥,]", "", regex=True)
            # Convert empty strings to NaN
            numeric_attempt = pd.to_numeric(cleaned_num_series, errors="coerce")

            # If at least 60% of non-empty entries parse as numeric, cast
            valid_count = series.replace("", np.nan).dropna().count()
            if valid_count > 0:
                parsed_count = numeric_attempt.dropna().count()
                if (parsed_count / valid_count) >= 0.6:
                    result_df[col] = numeric_attempt

        return result_df

    def compute_statistics(self, df: pd.DataFrame) -> TableStatistics:
        """Generate comprehensive statistical metrics using Pandas describe and null analysis."""
        total_rows = len(df)
        total_cols = len(df.columns)
        total_cells = max(total_rows * total_cols, 1)

        empty_cells = int(df.isna().sum().sum()) + int((df == "").sum().sum())
        completeness = round(((total_cells - empty_cells) / total_cells) * 100, 1)

        column_types: Dict[str, str] = {}
        numeric_summaries: Dict[str, Dict[str, float]] = {}

        for col in df.columns:
            dtype_str = str(df[col].dtype)
            if "int" in dtype_str or "float" in dtype_str:
                column_types[str(col)] = "Numeric"
                s = pd.to_numeric(df[col], errors="coerce").dropna()
                if not s.empty:
                    numeric_summaries[str(col)] = {
                        "count": float(s.count()),
                        "mean": round(float(s.mean()), 2),
                        "std": round(float(s.std()), 2) if len(s) > 1 else 0.0,
                        "min": round(float(s.min()), 2),
                        "q25": round(float(s.quantile(0.25)), 2),
                        "median": round(float(s.median()), 2),
                        "q75": round(float(s.quantile(0.75)), 2),
                        "max": round(float(s.max()), 2),
                        "sum": round(float(s.sum()), 2)
                    }
            elif "datetime" in dtype_str:
                column_types[str(col)] = "DateTime"
            else:
                column_types[str(col)] = "String"

        return TableStatistics(
            total_rows=total_rows,
            total_columns=total_cols,
            empty_cells_count=empty_cells,
            completeness_percentage=completeness,
            column_types=column_types,
            numeric_summaries=numeric_summaries
        )

    def merge_tables(self, tables: List[ExtractedTable]) -> ExtractedTable:
        """Concatenate multi-page tables that share matching or compatible schemas."""
        if not tables:
            raise ValueError("No tables provided for merge.")

        dfs = [self.table_to_dataframe(t) for t in tables]
        merged_df = pd.concat(dfs, ignore_index=True)

        return self.dataframe_to_table(
            merged_df,
            table_id=f"merged_{tables[0].table_id}",
            page_number=tables[0].page_number,
            strategy="concatenated"
        )

    def export_table(self, table: ExtractedTable, format_type: str) -> Tuple[bytes, str, str]:
        """Export table to CSV, Excel, JSON, or Markdown with proper MIME types."""
        df = self.table_to_dataframe(table)
        format_clean = format_type.lower().strip()

        if format_clean == "csv":
            content = df.to_csv(index=False).encode("utf-8")
            return content, "text/csv", f"{table.table_id}.csv"

        elif format_clean in ["xlsx", "excel"]:
            buffer = io.BytesIO()
            with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
                df.to_excel(writer, index=False, sheet_name="ExtractedData")
            return buffer.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", f"{table.table_id}.xlsx"

        elif format_clean == "json":
            content = df.to_json(orient="records", indent=2).encode("utf-8")
            return content, "application/json", f"{table.table_id}.json"

        elif format_clean in ["markdown", "md"]:
            content = df.to_markdown(index=False).encode("utf-8")
            return content, "text/markdown", f"{table.table_id}.md"

        else:
            raise ValueError(f"Unsupported export format: {format_type}")
