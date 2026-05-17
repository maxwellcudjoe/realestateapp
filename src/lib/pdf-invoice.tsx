import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer'
import { getBankDetails, INVOICE_TYPE_LABELS, type InvoiceType } from '@/lib/invoices'

export interface InvoicePdfData {
  invoiceNumber: string
  type: InvoiceType
  amount: number
  description: string
  issuedAt: Date
  dueAt: Date
  customer: {
    name: string
    email: string
    addressLine1?: string | null
    city?: string | null
    postcode?: string | null
    companyName?: string | null
  }
  dealAddress?: string | null
}

const fmtGbp = (n: number) => `£${Number(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtDate = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 10, color: '#1a1a1a', fontFamily: 'Helvetica' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 },
  brand: { fontSize: 24, fontFamily: 'Times-Roman', letterSpacing: 1 },
  brandSub: { fontSize: 9, color: '#666', marginTop: 4, letterSpacing: 0.5 },
  invoiceLabel: { fontSize: 9, color: '#888', letterSpacing: 2, marginBottom: 4 },
  invoiceNumber: { fontSize: 14 },
  meta: { textAlign: 'right' },
  section: { marginTop: 24 },
  sectionLabel: { fontSize: 8, color: '#888', letterSpacing: 2, marginBottom: 6 },
  row: { flexDirection: 'row', marginBottom: 2 },
  rowLabel: { width: 100, color: '#666' },
  table: { marginTop: 28, borderTopWidth: 1, borderTopColor: '#000', borderBottomWidth: 1, borderBottomColor: '#000' },
  tableHeader: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#ddd' },
  tableRow: { flexDirection: 'row', paddingVertical: 12 },
  tableHeaderText: { fontSize: 8, letterSpacing: 1.5, color: '#888' },
  colDescription: { flex: 1 },
  colAmount: { width: 100, textAlign: 'right' },
  totals: { marginTop: 16, alignItems: 'flex-end' },
  totalRow: { flexDirection: 'row', marginBottom: 4, width: 240, justifyContent: 'space-between' },
  totalLabel: { fontSize: 10, color: '#666' },
  totalValue: { fontSize: 10 },
  grandTotal: { borderTopWidth: 1, borderTopColor: '#000', paddingTop: 8, marginTop: 4 },
  grandTotalLabel: { fontSize: 11 },
  grandTotalValue: { fontSize: 14 },
  payment: { marginTop: 40, padding: 16, backgroundColor: '#f7f3e8' },
  paymentLabel: { fontSize: 8, color: '#7a6620', letterSpacing: 2, marginBottom: 6 },
  paymentRow: { flexDirection: 'row', marginBottom: 2 },
  paymentRowLabel: { width: 110, color: '#666' },
  footer: { position: 'absolute', bottom: 40, left: 48, right: 48, textAlign: 'center', fontSize: 8, color: '#888' },
})

function InvoiceDoc({ data }: { data: InvoicePdfData }) {
  const bank = getBankDetails()
  const customerLines = [
    data.customer.companyName,
    data.customer.name,
    data.customer.addressLine1,
    [data.customer.city, data.customer.postcode].filter(Boolean).join(' '),
    data.customer.email,
  ].filter(Boolean) as string[]

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>Rêve Bâtir</Text>
            <Text style={styles.brandSub}>UK PROPERTY INVESTMENT SOURCING</Text>
          </View>
          <View style={styles.meta}>
            <Text style={styles.invoiceLabel}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>{data.invoiceNumber}</Text>
            <View style={{ marginTop: 12 }}>
              <View style={[styles.row, { justifyContent: 'flex-end' }]}>
                <Text style={{ color: '#666', marginRight: 8 }}>Issued</Text>
                <Text>{fmtDate(data.issuedAt)}</Text>
              </View>
              <View style={[styles.row, { justifyContent: 'flex-end' }]}>
                <Text style={{ color: '#666', marginRight: 8 }}>Due</Text>
                <Text>{fmtDate(data.dueAt)}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>BILL TO</Text>
          {customerLines.map((line) => (
            <Text key={line} style={{ marginBottom: 2 }}>{line}</Text>
          ))}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colDescription]}>DESCRIPTION</Text>
            <Text style={[styles.tableHeaderText, styles.colAmount]}>AMOUNT</Text>
          </View>
          <View style={styles.tableRow}>
            <View style={styles.colDescription}>
              <Text style={{ marginBottom: 4 }}>{INVOICE_TYPE_LABELS[data.type]}</Text>
              <Text style={{ color: '#666', fontSize: 9 }}>{data.description}</Text>
              {data.dealAddress && (
                <Text style={{ color: '#666', fontSize: 9, marginTop: 4 }}>Re: {data.dealAddress}</Text>
              )}
            </View>
            <Text style={styles.colAmount}>{fmtGbp(data.amount)}</Text>
          </View>
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{fmtGbp(data.amount)}</Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={styles.grandTotalLabel}>Total due</Text>
            <Text style={styles.grandTotalValue}>{fmtGbp(data.amount)}</Text>
          </View>
        </View>

        <View style={styles.payment}>
          <Text style={styles.paymentLabel}>PAYMENT DETAILS — BANK TRANSFER</Text>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentRowLabel}>Account name</Text>
            <Text>{bank.accountName}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentRowLabel}>Bank</Text>
            <Text>{bank.bankName}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentRowLabel}>Sort code</Text>
            <Text>{bank.sortCode}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentRowLabel}>Account number</Text>
            <Text>{bank.accountNumber}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentRowLabel}>Reference</Text>
            <Text>{data.invoiceNumber}</Text>
          </View>
          {bank.vatNumber && (
            <View style={[styles.paymentRow, { marginTop: 8 }]}>
              <Text style={styles.paymentRowLabel}>VAT number</Text>
              <Text>{bank.vatNumber}</Text>
            </View>
          )}
        </View>

        <Text style={styles.footer}>
          Rêve Bâtir Ltd · revebatir.co.uk · Please quote {data.invoiceNumber} when paying.
        </Text>
      </Page>
    </Document>
  )
}

/** Renders an invoice PDF to a Buffer. */
export async function renderInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  const instance = pdf(<InvoiceDoc data={data} />)
  const blob = await instance.toBlob()
  const arrayBuffer = await blob.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
