import Image from 'next/image'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1>CFTC Commitment of Traders Viewer</h1>
      <section>
        <h2>What is the Commitment of Traders report?</h2>
        <article>
          The CFTC provides a report every week informing the public of positioning in futures markets.
        </article>
      </section>
    </main>
  )
}
