export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between w-11/12 mx-auto sm:w-3/4">
      <h1 className="text-3xl antialiased py-10">Commitment of Traders Viewer</h1>
      <section className="my-15">
        <article>
          <h2 className="text-2xl antialiased py-2">Get started</h2>
          <div>
            <p>
              View common futures:
            </p>
            <div className="space-x-5 flex-inline">
              <a
                className="text-blue-500 hover:text-blue-700"
                href={"/futures/financial-instruments/stock-indices/s%26p-broad-based-stock-indices/13874A/traders-in-financial-futures"}
              >
                S&P 500
              </a>
              <a
                className="text-blue-500 hover:text-blue-700"
                href={"/futures/financial-instruments/stock-indices/nasdaq--broadbased-indices/209742/traders-in-financial-futures"}
              >
                Nasdaq-100
              </a>
              <a
                className="text-blue-500 hover:text-blue-700"
                href={"/futures/natural-resources/petroleum-and-products/crude-oil/067651/disaggregated"}
              >
                Crude Oil
              </a>
            </div>
          </div>
          <div className="pt-5">
            <div className="pb-5">Or explore all the various categories (we have <em>everything</em> the CFTC collects reports on)…</div>
            <ul className="space-y-5 flex flex-col ml-3 text-lg">
              <li><a className="text-blue-500 hover:text-blue-700" href={"/futures/financial-instruments"}>Financial (stock indices, bonds, currencies)</a></li>
              <li><a className="text-blue-500 hover:text-blue-700" href={"/futures/agriculture"}>Agriculture (softs, grains)</a></li>
              <li><a className="text-blue-500 hover:text-blue-700" href={"/futures/natural-resources"}>Natural Resources (energy, materials)</a></li>
            </ul>
          </div>
        </article>
      </section>
      <section>
        <article className="hyphens-auto break-words leading-9 my-20">
          <h2 className="text-xl antialiased py-2">What is the Commitment of Traders report? 📊</h2>
          <p className="my-2">The CFTC provides a report every week informing the public of positioning in futures markets.</p>

          <p className="my-3">
            Ever wondered how the big players in the financial markets are moving their chips around the table? Well, that's where the CFTC Commitment of Traders (COT) Report comes into play.
          </p>

          <p className="my-3">
            Imagine peeking behind the curtain of the market to see who's making the big bets and why. That's exactly what the CFTC COT Report does (well, kind of). CFTC stands for the Commodity Futures Trading Commission, the watchdogs of the financial markets in the U.S.
          </p>

          <p className="my-3">
            This report is like a weekly snapshot that shows us who's doing what in the world of financial futures (which are like bets on the future prices of stuff like stocks, commodities, and more). It helps us understand what the big financial institutions, traders, and even small investors are up to.
          </p>

          <p className="my-3">
            Learn more about the Commitment of Traders reports from <a className="text-blue-500 hover:text-blue-700" href="https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm" target="_blank" rel="nofollow">the CFTC's website</a>. In particular, to learn about the different types of reports, check these links: <a className="text-blue-500 hover:text-blue-700" href="https://www.cftc.gov/idc/groups/public/@commitmentsoftraders/documents/file/disaggregatedcotexplanatorynot.pdf" target="_blank" rel="nofollow">Disaggregated</a>, <a className="text-blue-500 hover:text-blue-700" href="https://www.cftc.gov/idc/groups/public/@commitmentsoftraders/documents/file/tfmexplanatorynotes.pdf" target="_blank" rel="nofollow">Traders in Financial Futures</a>. The "Legacy" report refers to a style of report which only separates traders into three groups: Commercials, Non-Commercials, and Non-Reportables. Commercials are companies that participate in the futures market as a matter of business, e.g., as a farmer hedging his crops. Non-Commercials are speculators like hedge funds. Non-Reportables are small size traders who do not have to report positioning to the CFTC; these are typically retail traders. Traders in Financial Futures or Disaggreagted reports have more graular categories than the simple 3 categories in the Legacy reports.
          </p>
        </article>
      </section>
    </main>
  )
}
