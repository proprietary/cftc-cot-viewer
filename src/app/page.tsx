import Image from 'next/image'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1>CFTC Commitment of Traders Viewer</h1>
      <section>
        <h2>What is the Commitment of Traders report?</h2>
        <article>
          The CFTC provides a report every week informing the public of positioning in futures markets.

          The Commitment of Traders (COT) report is a weekly publication by the Commodity Futures Trading Commission (CFTC) that provides a breakdown of open interest for markets in which 20 or more traders hold positions equal to or above the reporting levels established by the CFTC 1. The report is released every Friday at 3 pm CT and provides a comprehensive and highly configurable graphical representation of the CFTC’s report on market open interest based on open positions as of the preceding Tuesday 2. The report is available with both the Disaggregated and Financial Traders Reports 1. The Disaggregated Report provides a detailed breakdown of the reportable open interest positions held by commercial traders, non-commercial traders, and non-reportable traders 1. The Financial Traders Report provides information on the open interest of financial institutions that are not included in the other categories 1.

          The report is used by traders to identify trends and potential price movements in the futures markets. It can also be used to identify potential market manipulation by large traders 3. The report is an important tool for traders who want to stay informed about market trends and make informed trading decisions.
        </article>
      </section>
    </main>
  )
}
