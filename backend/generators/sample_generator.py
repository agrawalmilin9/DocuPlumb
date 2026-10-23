"""Generate real binary PDF sample documents using ReportLab for immediate real-world testing."""
import io
import os
from typing import Dict
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle


class SampleDocumentGenerator:
    """Generates authentic, high-fidelity sample PDF files with real embedded tables."""

    @staticmethod
    def generate_invoice() -> bytes:
        """Generate a realistic commercial logistics invoice with structured tables."""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )
        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            'InvTitle',
            parent=styles['Heading1'],
            fontSize=18,
            leading=22,
            textColor=colors.HexColor('#0F172A')
        )
        meta_style = ParagraphStyle(
            'InvMeta',
            parent=styles['Normal'],
            fontSize=9,
            leading=13,
            textColor=colors.HexColor('#475569')
        )

        elements = []
        elements.append(Paragraph("<b>GLOBAL FREIGHT & LOGISTICS CORP</b>", title_style))
        elements.append(Paragraph("Commercial Billing Department · Operations Center East", meta_style))
        elements.append(Spacer(1, 14))

        # Invoice Header Metadata block
        header_data = [
            ["Invoice Number: INV-2026-8842", "Invoice Date: March 14, 2026"],
            ["P.O. Number: PO-77192", "Due Date: April 14, 2026"],
            ["Tax ID: VAT-9481024", "Account Number: ACC-49102-B"],
            ["Customer: Apex Manufacturing Ltd", "Contact: billing@apex-mfg.com"]
        ]
        hdr_table = Table(header_data, colWidths=[270, 270])
        hdr_table.setStyle(TableStyle([
            ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
            ('FONTSIZE', (0,0), (-1,-1), 9),
            ('TEXTCOLOR', (0,0), (-1,-1), colors.HexColor('#1E293B')),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('TOPPADDING', (0,0), (-1,-1), 4),
        ]))
        elements.append(hdr_table)
        elements.append(Spacer(1, 16))

        # Line items table
        items_data = [
            ["Item Code", "Service Description", "Qty", "Unit Price ($)", "Total Amount ($)"],
            ["LOG-SEA-01", "Ocean Container 40ft High-Cube Transit (Shenzhen to Rotterdam)", "2", "3,450.00", "6,900.00"],
            ["LOG-CUST-88", "Customs Clearance & Brokerage Documentation Filing", "1", "480.00", "480.00"],
            ["LOG-TRK-12", "Intermodal Drayage & Final Mile Destination Transport", "2", "850.00", "1,700.00"],
            ["LOG-INS-04", "All-Risk Marine Cargo Insurance Underwriting", "1", "325.50", "325.50"],
            ["LOG-PORT-09", "Terminal Handling Charges & Port Berth Facility Fees", "2", "295.00", "590.00"],
            ["LOG-STOR-02", "Bonded Cold-Chain Warehouse Storage (3 Business Days)", "3", "140.00", "420.00"],
        ]

        item_table = Table(items_data, colWidths=[80, 260, 40, 80, 80])
        item_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F1F5F9')),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
            ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(item_table)
        elements.append(Spacer(1, 14))

        # Summary box
        summary_data = [
            ["", "", "Subtotal:", "$10,415.50"],
            ["", "", "Sales Tax (6.5%):", "$677.01"],
            ["", "", "Total Amount Due:", "$11,092.51"]
        ]
        summary_table = Table(summary_data, colWidths=[180, 160, 100, 100])
        summary_table.setStyle(TableStyle([
            ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
            ('FONTNAME', (3, -1), (3, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
            ('LINEABOVE', (2, -1), (3, -1), 1, colors.HexColor('#0F172A')),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        elements.append(summary_table)

        doc.build(elements)
        return buffer.getvalue()

    @staticmethod
    def generate_financial_statement() -> bytes:
        """Generate a corporate quarterly balance sheet and income ledger."""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )
        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            'FinTitle',
            parent=styles['Heading1'],
            fontSize=18,
            leading=22,
            textColor=colors.HexColor('#0F172A')
        )
        sub_style = ParagraphStyle(
            'FinSub',
            parent=styles['Normal'],
            fontSize=9,
            leading=13,
            textColor=colors.HexColor('#475569')
        )

        elements = []
        elements.append(Paragraph("<b>VERIDIAN HORIZONS HOLDINGS CORP</b>", title_style))
        elements.append(Paragraph("Consolidated Statement of Operations & Financial Highlights · Q3 Fiscal Year 2026", sub_style))
        elements.append(Spacer(1, 14))

        fin_data = [
            ["Financial Segment", "Q1 2026 ($M)", "Q2 2026 ($M)", "Q3 2026 ($M)", "YoY Growth (%)", "Operating Margin (%)"],
            ["Cloud Infrastructure & APIs", "142.8", "158.4", "184.2", "+29.0%", "34.5%"],
            ["Enterprise Platform Subscriptions", "88.6", "94.2", "102.5", "+15.7%", "41.2%"],
            ["Professional Implementation Services", "24.1", "26.3", "27.8", "+15.3%", "18.4%"],
            ["Hardware Appliances & Edge Gateways", "36.5", "39.1", "41.0", "+12.3%", "22.1%"],
            ["Digital Marketplace Revenue", "19.4", "22.0", "25.6", "+31.9%", "58.0%"],
            ["Total Consolidated Revenue", "311.4", "340.0", "381.1", "+22.4%", "32.8%"],
            ["Research & Development Expenditure", "64.2", "68.5", "73.1", "+13.8%", "19.2%"],
            ["Sales & Strategic Marketing", "58.0", "62.1", "67.4", "+16.2%", "17.7%"],
            ["Net Income Before Taxes", "48.6", "54.2", "66.8", "+37.4%", "17.5%"],
        ]

        fin_table = Table(fin_data, colWidths=[170, 74, 74, 74, 74, 74])
        fin_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8.5),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
            ('BACKGROUND', (0, 6), (-1, 6), colors.HexColor('#F1F5F9')),
            ('FONTNAME', (0, 6), (-1, 6), 'Helvetica-Bold'),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(fin_table)
        elements.append(Spacer(1, 14))

        doc.build(elements)
        return buffer.getvalue()

    @staticmethod
    def generate_clinical_lab_report() -> bytes:
        """Generate a medical pathology/lab diagnostics report."""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )
        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            'LabTitle',
            parent=styles['Heading1'],
            fontSize=16,
            leading=20,
            textColor=colors.HexColor('#0F172A')
        )
        sub_style = ParagraphStyle(
            'LabSub',
            parent=styles['Normal'],
            fontSize=9,
            leading=13,
            textColor=colors.HexColor('#475569')
        )

        elements = []
        elements.append(Paragraph("<b>BIO-ANALYTICS CLINICAL REFERENCE LABS</b>", title_style))
        elements.append(Paragraph("Comprehensive Metabolic Panel & Complete Blood Count · CLIA ID: 99D1048201", sub_style))
        elements.append(Spacer(1, 12))

        meta_data = [
            ["Patient Name: Sarah M. Jenkins", "Specimen ID: SP-2026-99381"],
            ["DOB: 1984-06-12", "Collection Date: 2026-03-10"],
            ["Ordering Physician: Dr. Robert Vance, MD", "Facility: Metro Health Clinic"]
        ]
        meta_table = Table(meta_data, colWidths=[270, 270])
        meta_table.setStyle(TableStyle([
            ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
            ('FONTSIZE', (0,0), (-1,-1), 8.5),
            ('TEXTCOLOR', (0,0), (-1,-1), colors.HexColor('#334155')),
            ('BOTTOMPADDING', (0,0), (-1,-1), 3),
            ('TOPPADDING', (0,0), (-1,-1), 3),
        ]))
        elements.append(meta_table)
        elements.append(Spacer(1, 14))

        lab_data = [
            ["Analyte / Test Component", "Observed Value", "Reference Interval", "Units", "Clinical Status"],
            ["Glucose Fasting Serum", "94", "70 - 99", "mg/dL", "Normal"],
            ["Blood Urea Nitrogen (BUN)", "16", "7 - 20", "mg/dL", "Normal"],
            ["Creatinine Serum", "0.88", "0.50 - 1.10", "mg/dL", "Normal"],
            ["Sodium Serum", "141", "136 - 145", "mmol/L", "Normal"],
            ["Potassium Serum", "4.3", "3.5 - 5.1", "mmol/L", "Normal"],
            ["Chloride Serum", "102", "98 - 107", "mmol/L", "Normal"],
            ["Carbon Dioxide Total", "25", "22 - 29", "mmol/L", "Normal"],
            ["Calcium Total Serum", "9.6", "8.6 - 10.2", "mg/dL", "Normal"],
            ["Total Protein Serum", "7.1", "6.4 - 8.3", "g/dL", "Normal"],
            ["Albumin Serum", "4.5", "3.5 - 5.0", "g/dL", "Normal"],
            ["Total Bilirubin", "0.6", "0.2 - 1.2", "mg/dL", "Normal"],
            ["Alkaline Phosphatase (ALP)", "68", "44 - 121", "U/L", "Normal"],
            ["Alanine Aminotransferase (ALT)", "22", "7 - 56", "U/L", "Normal"],
        ]

        lab_table = Table(lab_data, colWidths=[180, 85, 95, 75, 105])
        lab_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F8FAFC')),
            ('LINEBELOW', (0, 0), (-1, 0), 1.5, colors.HexColor('#0F172A')),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8.5),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(lab_table)

        doc.build(elements)
        return buffer.getvalue()
