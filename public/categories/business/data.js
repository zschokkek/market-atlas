const companies = [
  ["robinhood","Robinhood","HOOD","Menlo Park, California",37.4529,-122.1817,"Technology","KXHOODA-28JANFUNDED","Robinhood funded customers in 2026",135183,["Above 28 million","Above 29 million","Above 30 million"]],
  ["starbucks","Starbucks","SBUX","Seattle, Washington",47.6062,-122.3321,"Consumer","KXSBUXA-28JANSTORES","Starbucks total global stores in 2026",85878,["Above 41,300","Above 42,000","Above 43,000"]],
  ["norwegian-cruise","Norwegian Cruise Line","NCLH","Miami, Florida",25.7617,-80.1918,"Travel","KXNCLHA-28JANPAX","Norwegian Cruise passengers carried in 2026",60733,["Above 3.1 million","Above 3.3 million","Above 3.5 million"]],
  ["rivian","Rivian","RIVN","Irvine, California",33.6846,-117.8265,"Mobility","KXRIVNA-28JANDELIV","Rivian vehicles delivered in 2026",55301,["Above 38,000","Above 45,000","Above 52,000"]],
  ["tesla","Tesla","TSLA","Austin, Texas",30.2672,-97.7431,"Mobility","KXTSLAA-28JANDEL","Tesla total deliveries in 2026",54914,["Above 1.5 million","Above 1.7 million","Above 1.9 million"]],
  ["ebay","eBay","EBAY","San Jose, California",37.3382,-121.8863,"Consumer","KXEBAYA-28JANGMV","eBay gross merchandise volume in 2026",49780,["Above $84 billion","Above $88 billion","Above $92 billion"]],
  ["meta","Meta","META","Menlo Park, California",37.4848,-122.1484,"Technology","KXMETAA-28JANHEAD","Meta headcount in 2026",46749,["Above 65,000","Above 71,000","Above 77,000"]],
  ["carnival","Carnival","CCL","Miami, Florida",25.7743,-80.1937,"Travel","KXCCLA-28JANALBD","Carnival Cruise capacity in 2026",38519,["Above 97 million days","Above 98 million days","Above 99 million days"]],
  ["boeing","Boeing","BA","Arlington, Virginia",38.8816,-77.091,"Industrial","KXBAA-28JANDELIV","Boeing airplane deliveries in 2026",36412,["Above 560","Above 640","Above 720"]],
  ["mercadolibre","MercadoLibre","MELI","Buenos Aires, Argentina",-34.6037,-58.3816,"Consumer","KXMELIA-28JANITEMS","MercadoLibre items sold in 2026",33915,["Above 3 billion","Above 3.5 billion","Above 4 billion"]],
  ["ford","Ford","F","Dearborn, Michigan",42.3223,-83.1763,"Mobility","KXFA-28JANUSSALES","Ford U.S. vehicle sales in 2026",31449,["Above 1.8 million","Above 2.1 million","Above 2.4 million"]],
  ["ferrari","Ferrari","RACE","Maranello, Italy",44.5263,10.8667,"Mobility","KXRACEA-28JANSHIP","Ferrari car shipments in 2026",26974,["Above 13,000","Above 14,000","Above 15,000"]],
  ["grab","Grab","GRAB","Singapore",1.3521,103.8198,"Technology","KXGRABA-28JANMTU","Grab monthly users in 2026",26398,["Above 55 million","Above 60 million","Above 65 million"]],
  ["match-group","Match Group","MTCH","Dallas, Texas",32.7767,-96.797,"Technology","KXMTCHA-28JANPAYERS","Match total payers in 2026",25221,["Above 12.4 million","Above 13.4 million","Above 14.4 million"]],
  ["united-airlines","United Airlines","UAL","Chicago, Illinois",41.8781,-87.6298,"Travel","KXUALA-28JANPAX","United Airlines passengers in 2026",22377,["Above 178 million","Above 190 million","Above 202 million"]],
  ["chipotle","Chipotle","CMG","Newport Beach, California",33.6189,-117.9298,"Consumer","KXCMGA-28JANRESTS","Chipotle restaurant count in 2026",17082,["Above 4,300","Above 4,500","Above 4,700"]],
  ["palantir","Palantir","PLTR","Denver, Colorado",39.7392,-104.9903,"Technology","KXPLTRA-28JANCUST","Palantir customer count in 2026",16420,["Above 1,100","Above 1,200","Above 1,300"]],
  ["reddit","Reddit","RDDT","San Francisco, California",37.7749,-122.4194,"Technology","KXRDDTA-28JANDAU","Reddit daily active users in 2026",11961,["Above 136 million","Above 150 million","Above 164 million"]],
  ["spotify","Spotify","SPOT","Stockholm, Sweden",59.3293,18.0686,"Technology","KXSPOTA-28JANPREMSUBS","Spotify premium subscribers in 2026",10161,["Above 314 million","Above 330 million","Above 346 million"]],
  ["carvana","Carvana","CVNA","Tempe, Arizona",33.4255,-111.94,"Mobility","KXCVNAA-28JANUNITS","Carvana vehicle sales in 2026",10035,["Above 780,000","Above 850,000","Above 920,000"]],
  ["amazon","Amazon","AMZN","Seattle, Washington",47.61,-122.337,"Technology","KXAMZNA-28JANHEAD","Amazon headcount in 2026",30149,["Above 1.5 million","Above 1.6 million","Above 1.7 million"]],
  ["apple","Apple","AAPL","Cupertino, California",37.323,-122.0322,"Technology","KXAAPLA-28JANHEAD","Apple headcount in 2026",8352,["Above 164,000","Above 170,000","Above 176,000"]],
  ["google","Google","GOOG","Mountain View, California",37.422,-122.0841,"Technology","KXGOOGA-28JANHEAD","Google headcount in 2026",27729,["Above 188,000","Above 200,000","Above 212,000"]],
  ["nvidia","Nvidia","NVDA","Santa Clara, California",37.3541,-121.9552,"Technology","KXNVDAA-28JANHEAD","Nvidia headcount in fiscal 2027",17100,["Above 46,000","Above 52,000","Above 58,000"]],
  ["netflix","Netflix","NFLX","Los Gatos, California",37.2358,-121.9624,"Technology","KXNFLXA-28JANHEAD","Netflix headcount in 2026",11720,["Above 16,500","Above 18,000","Above 19,500"]],
  ["bmw","BMW","BMW","Munich, Germany",48.1351,11.582,"Mobility","KXELECTRICM3-28","Will BMW release a fully electric M3 before 2028?",19484,["Fully electric M3"]]
];

const isInternationalCompany = location => ["Argentina", "Italy", "Singapore", "Sweden", "Germany"]
  .some(country => location.includes(country));

const companyBundles = companies.map(([id,name,code,location,lat,lon,kind,eventTicker,title,volume,labels], index) => ({
  id, name, code, location, lat, lon, kind,
  horizon: isInternationalCompany(location) ? "International" : "United States",
  markets: [{
    id: `${eventTicker}:${id}`, eventTicker, seriesTicker: eventTicker.split("-")[0], title, volume, kind, endsAt: "2028-01-31T21:00:00Z",
    horizon: isInternationalCompany(location) ? "International" : "United States",
    markerCode: code,
    url: `https://kalshi.com/markets_by_ticker/${eventTicker.toLowerCase()}`,
    outcomes: labels.map((label, outcomeIndex) => ({ name: label, price: Math.max(1, Math.min(99, 88 - outcomeIndex * 31 - (index % 7))) }))
  }]
}));

const musicMarket = (eventTicker, marketTicker, title, artist, volume, price, relationship) => ({
  id: `${eventTicker}:${marketTicker}`,
  eventTicker,
  seriesTicker: eventTicker.split("-")[0],
  marketTicker,
  title,
  subtitle: `${artist} · ${relationship}`,
  volume,
  kind: "Music",
  endsAt: "2027-12-31T23:59:00Z",
  horizon: "United States",
  url: `https://kalshi.com/markets_by_ticker/${marketTicker.toLowerCase()}`,
  outcomes: [{ name: artist, ticker: marketTicker, price, volume }]
});

// Verified against Kalshi on August 4, 2026. The live cached event replaces
// these prices after load and automatically carries any newly listed artists.
const coachellaFallbackOutcomes = `DRA~Drake~15|TAY~Taylor Swift~19|BAD~Bad Bunny~14|WEE~The Weeknd~11|JUS~Justin Bieber~4|ARI~Ariana Grande~16|ED~Ed Sheeran~6|TRA~Travis Scott~8|EMI~Eminem~9|KAN~Kanye West / Ye~1|RIH~Rihanna~19|BIL~Billie Eilish~22|KEN~Kendrick Lamar~12|POS~Post Malone~11|JBA~J Balvin~0|FUT~Future~6|BRU~Bruno Mars~19|BTS~BTS~34|OZU~Ozuna~0|COL~Coldplay~12|NIC~Nicki Minaj~10|CHR~Chris Brown~0|CUA~Dua Lipa~52|DAV~David Guetta~7|LAN~Lana Del Rey~1|WAY~Lil Wayne~0|21S~21 Savage~0|RUA~Rauw Alejandro~1|ANU~Anuel AA~0|SZA~SZA~22|KAR~KAROL G~1|KHA~Khalid~0|LAD~Lady Gaga~9|BAB~Lil Baby~10|MARO~Maroon 5~0|BEY~Beyoncé~16|CAL~Calvin Harris~14|UZI~Lil Uzi Vert~9|JCO~J. Cole~1|SIA~Sia~0|THU~Young Thug~10|LIN~Linkin Park~8|DOJ~Doja Cat~5|SHAW~Shawn Mendes~0|SAM~Sam Smith~0|QUA~Quavo~0|TRI~Trippie Redd~1|YOU~YoungBoy Never Broke Again~0|TYG~Tyga~0|FRA~Frank Ocean~0|CHA~Charlie Puth~6|LUK~Luke Combs~0|ZAC~Zach Bryan~1|JAS~Jason Derulo~0|USH~USHER~0|KOD~Kodak Black~0|TIM~Justin Timberlake~13|BEB~Bebe Rexha~0|SWA~Swae Lee~2|BLA~BLACKPINK~9|KAL~Kali Uchis~6|DON~Don Toliver~7|DAF~Daft Punk~10|TAT~Tate McRae~21|BIG~Big Sean~0|MIG~Migos~0|POL~Polo G~2|PHA~Pharrell Williams~0|KID~The Kid LAROI~4|KIDC~Kid Cudi~0|OFF~Offset~0|2CH~2 Chainz~0|FAL~Fall Out Boy~8|LEW~Lewis Capaldi~0|JOJ~Joji~0|ROD~Roddy Ricch~0|DAN~Daniel Caesar~0|CAM~Camilo~0|NF~NF~0|BRY~Bryson Tiller~0|STR~Stray Kids~1|LOG~Logic~0|XCX~Charli xcx~22|NASX~Lil Nas X~0|PAR~PARTYNEXTDOOR~0|JOH~John Mayer~0|ROS~ROSALÍA~20|MEG~Megan Thee Stallion~7|MGK~mgk~0|MAR~Mariah Carey~0|CHI~Childish Gambino~6|YAC~Lil Yachty~5|FRE~Fred again..~38|ALE~Alex Warren~8|CHAP~Chappell Roan~19|BEN~Benson Boone~6|PIN~PinkPantheress~1|ICE~Ice Spice~0|SAB~Sabrina Carpenter~8|TYL~Tyla~5|DOE~Doechii~1|OLI~Olivia Dean~21|LEO~Leon Thomas~0|SOM~sombr~7|KAT~KATSEYE~6|MARI~The Marías~7|ADD~Addison Rae~1|LOL~Lola Young~0|ELL~Ella Langley~4|GRA~Gracie Abrams~6|SHA~Shaboozey~0|OLIV~Olivia Rodrigo~19|RAD~Radiohead~46|MIL~Miley Cyrus~20`
  .split("|")
  .map(item => {
    const [suffix, name, price] = item.split("~");
    return { name, ticker: `KXROLEATEVENTCOACHELLA-27DEC31-${suffix}`, price: Number(price), volume: 0 };
  })
  .sort((left, right) => right.price - left.price || left.name.localeCompare(right.name));

const coachellaFallbackMarket = {
  id: "KXROLEATEVENTCOACHELLA-27DEC31:music-coachella",
  eventTicker: "KXROLEATEVENTCOACHELLA-27DEC31",
  seriesTicker: "KXROLEATEVENTCOACHELLA",
  title: "Who will headline Coachella 2027?",
  volume: 144715,
  kind: "Music",
  endsAt: "2027-12-31T23:59:00Z",
  horizon: "United States",
  markerCode: "COA",
  url: "https://kalshi.com/markets/kxroleateventcoachella/who-will-headline-coachella/kxroleateventcoachella-27dec31",
  outcomes: coachellaFallbackOutcomes
};

const venueFallbackMarket = (eventTicker, title, markerCode, url, outcomes) => ({
  id: `${eventTicker}:venue`, eventTicker, seriesTicker: eventTicker.split("-")[0], title,
  volume: outcomes.reduce((sum, outcome) => sum + outcome.volume, 0), kind: "Music",
  endsAt: "2027-12-31T23:59:00Z", horizon: "United States", markerCode, url,
  outcomes: outcomes.sort((left, right) => right.price - left.price || right.volume - left.volume)
});

const musicBundles = [
  {
    id: "music-toronto", name: "Toronto artists", code: "YYZ", location: "Toronto, Canada · Artist base", lat: 43.6532, lon: -79.3832, kind: "Music", horizon: "International",
    markets: [
      musicMarket("KXTOPARTISTUSA-26", "KXTOPARTISTUSA-26-DRA", "Will Drake be the #1 most streamed U.S. Spotify artist in 2026?", "Drake", 196069, 79, "Artist base"),
      musicMarket("KXTOPARTISTUSA-26", "KXTOPARTISTUSA-26-WEE", "Will The Weeknd be the #1 most streamed U.S. Spotify artist in 2026?", "The Weeknd", 38194, 1, "Artist origin")
    ]
  },
  {
    id: "music-san-juan", name: "San Juan artists", code: "SJU", location: "San Juan, Puerto Rico · Artist origin", lat: 18.4655, lon: -66.1057, kind: "Music", horizon: "United States",
    markets: [musicMarket("KXTOPARTISTUSA-26", "KXTOPARTISTUSA-26-BAD", "Will Bad Bunny be the #1 most streamed U.S. Spotify artist in 2026?", "Bad Bunny", 176876, 10, "Artist origin")]
  },
  {
    id: "music-nashville", name: "Nashville artists", code: "BNA", location: "Nashville, Tennessee · Artist base", lat: 36.1627, lon: -86.7816, kind: "Music", horizon: "United States",
    markets: [musicMarket("KXTOPARTISTUSA-26", "KXTOPARTISTUSA-26-TAY", "Will Taylor Swift be the #1 most streamed U.S. Spotify artist in 2026?", "Taylor Swift", 133746, 8, "Artist base")]
  },
  {
    id: "music-honolulu", name: "Honolulu artists", code: "HNL", location: "Honolulu, Hawaii · Artist origin", lat: 21.3099, lon: -157.8581, kind: "Music", horizon: "United States",
    markets: [musicMarket("KXTOPARTISTUSA-26", "KXTOPARTISTUSA-26-BRUN", "Will Bruno Mars be the #1 most streamed U.S. Spotify artist in 2026?", "Bruno Mars", 99408, 2, "Artist origin")]
  },
  {
    id: "music-seoul", name: "Seoul artists", code: "SEL", location: "Seoul, South Korea · Group origin", lat: 37.5665, lon: 126.978, kind: "Music", horizon: "International",
    markets: [musicMarket("KXTOPARTISTUSA-26", "KXTOPARTISTUSA-26-BTS", "Will BTS be the #1 most streamed U.S. Spotify artist in 2026?", "BTS", 53563, 1, "Group origin")]
  },
  {
    id: "music-compton", name: "Compton artists", code: "CPT", location: "Compton, California · Artist origin", lat: 33.8958, lon: -118.2201, kind: "Music", horizon: "United States",
    markets: [musicMarket("KXTOPARTISTUSA-26", "KXTOPARTISTUSA-26-KEN", "Will Kendrick Lamar be the #1 most streamed U.S. Spotify artist in 2026?", "Kendrick Lamar", 39008, 2, "Artist origin")]
  },
  {
    id: "music-houston", name: "Houston artists", code: "HOU", location: "Houston, Texas · Artist origin", lat: 29.7604, lon: -95.3698, kind: "Music", horizon: "United States",
    markets: [musicMarket("KXTOPARTISTUSA-26", "KXTOPARTISTUSA-26-BEY", "Will Beyonce be the #1 most streamed U.S. Spotify artist in 2026?", "Beyonce", 14135, 1, "Artist origin")]
  },
  {
    id: "music-sphere", name: "Sphere", code: "SPH", location: "Sphere · Las Vegas, Nevada", lat: 36.1208, lon: -115.1645, kind: "Music", horizon: "United States",
    markets: [venueFallbackMarket(
      "KXVENUEPERFORMANCESPHERE-28JAN01", "Who will perform at Las Vegas Sphere in 2027?", "SPH",
      "https://kalshi.com/markets/kxvenueperformancesphere/who-will-perform-at-las-vegas-sphere-in-2027/kxvenueperformancesphere-28jan01",
      [
        ["JAY", "Jay-Z", 19, 1553], ["YE", "Kanye West (Ye)", 13, 2954], ["SPI", "Spice Girls", 32, 8015],
        ["TAY", "Taylor Swift", 24, 7846], ["BEY", "Beyoncé", 27, 5489], ["DRA", "Drake", 25, 3137],
        ["WEE", "The Weeknd", 24, 3221], ["COL", "Coldplay", 32, 8612], ["BAD", "Bad Bunny", 13, 5739],
        ["U2", "U2", 18, 6756], ["TRA", "Travis Scott", 19, 4711], ["FRE", "Fred again..", 9, 4897]
      ].map(([suffix, name, price, volume]) => ({ name, ticker: `KXVENUEPERFORMANCESPHERE-28JAN01-${suffix}`, price, volume }))
    )]
  },
  {
    id: "music-msg", name: "Madison Square Garden", code: "MSG", location: "Madison Square Garden · New York, New York", lat: 40.7505, lon: -73.9934, kind: "Music", horizon: "United States",
    markets: [venueFallbackMarket(
      "KXVENUEPERFORMANCEMSG-27DEC31", "Who will perform at Madison Square Garden 2027?", "MSG",
      "https://kalshi.com/markets/kxvenueperformancemsg/who-will-perform-at-madison-square-garden-2027/kxvenueperformancemsg-27dec31",
      [
        ["TAY", "Taylor Swift", 22, 1363], ["DRA", "Drake", 47, 88], ["WEE", "The Weeknd", 31, 70],
        ["BAD", "Bad Bunny", 17, 581], ["KAN", "Kanye West (Ye)", 21, 955], ["BRU", "Bruno Mars", 34, 225],
        ["FRE", "Fred again..", 54, 102], ["TRA", "Travis Scott", 40, 6], ["CHA", "Chappell Roan", 19, 25],
        ["SAB", "Sabrina Carpenter", 49, 325], ["OLI", "Olivia Rodrigo", 40, 2370], ["TAT", "Tate McRae", 44, 149],
        ["ICE", "Ice Spice", 10, 113], ["CEN", "Central Cee", 17, 2], ["PLA", "Playboi Carti", 26, 3]
      ].map(([suffix, name, price, volume]) => ({ name, ticker: `KXVENUEPERFORMANCEMSG-27DEC31-${suffix}`, price, volume }))
    )]
  },
  {
    id: "music-rolling-loud-miami", name: "Rolling Loud Miami", code: "RLM", location: "Miami, Florida · Festival city", lat: 25.7617, lon: -80.1918, kind: "Music", horizon: "United States",
    markets: [musicMarket("KXROLEATEVENTROLLING-27DEC31", "KXROLEATEVENTROLLING-27DEC31-TRA", "Will Travis Scott headline Rolling Loud Miami 2026?", "Travis Scott", 3106, 1, "Festival city")]
  },
  {
    id: "music-coachella", name: "Coachella", code: "COA", location: "Empire Polo Club · Indio, California", lat: 33.6803, lon: -116.237, kind: "Music", horizon: "United States",
    markets: [coachellaFallbackMarket]
  },
  {
    id: "music-lollapalooza", name: "Lollapalooza Chicago", code: "LOL", location: "Grant Park · Chicago, Illinois", lat: 41.8757, lon: -87.6189, kind: "Music", horizon: "United States",
    markets: [musicMarket("KXPERFORM-27", "KXPERFORM-27-BIL", "Will Billie Eilish perform at Lollapalooza Chicago 2027?", "Billie Eilish", 0, 0, "Festival venue")]
  },
  {
    id: "music-stratford-on", name: "Stratford artists", code: "STR", location: "Stratford, Ontario · Artist origin", lat: 43.37, lon: -80.982, kind: "Music", horizon: "International",
    markets: [musicMarket("KXRANKLISTIFPIARTIST-27FEB28", "KXRANKLISTIFPIARTIST-27FEB28-JUS", "IFPI's biggest-selling global recording artist of 2026?", "Justin Bieber", 121, 4, "Artist origin")]
  },
  {
    id: "music-london", name: "London artists", code: "LON", location: "London, United Kingdom · Artist origin", lat: 51.5074, lon: -0.1278, kind: "Music", horizon: "International",
    markets: [musicMarket("KXRANKLISTIFPIARTIST-27FEB28", "KXRANKLISTIFPIARTIST-27FEB28-ADE", "IFPI's biggest-selling global recording artist of 2026?", "Adele", 38, 1, "Artist origin")]
  },
  {
    id: "music-suffolk", name: "Suffolk artists", code: "SFK", location: "Framlingham, Suffolk · Artist base", lat: 52.2219, lon: 1.342, kind: "Music", horizon: "International",
    markets: [musicMarket("KXRANKLISTIFPIARTIST-27FEB28", "KXRANKLISTIFPIARTIST-27FEB28-EDS", "IFPI's biggest-selling global recording artist of 2026?", "Ed Sheeran", 38, 1, "Artist base")]
  },
  {
    id: "music-tokyo", name: "Tokyo artists", code: "TYO", location: "Tokyo, Japan · Group origin", lat: 35.6762, lon: 139.6503, kind: "Music", horizon: "International",
    markets: [musicMarket("KXRANKLISTIFPIARTIST-27FEB28", "KXRANKLISTIFPIARTIST-27FEB28-MRS", "IFPI's biggest-selling global recording artist of 2026?", "Mrs. GREEN APPLE", 43, 4, "Group origin")]
  }
];

musicBundles.find(bundle => bundle.id === "music-toronto").markets.push(
  musicMarket("KXRANKLISTIFPIARTIST-27FEB28", "KXRANKLISTIFPIARTIST-27FEB28-DRA", "IFPI's biggest-selling global recording artist of 2026?", "Drake", 199, 9, "Artist origin"),
  musicMarket("KXRANKLISTIFPIARTIST-27FEB28", "KXRANKLISTIFPIARTIST-27FEB28-WEE", "IFPI's biggest-selling global recording artist of 2026?", "The Weeknd", 40, 2, "Artist origin")
);

musicBundles.find(bundle => bundle.id === "music-seoul").markets.push(
  musicMarket("KXRANKLISTIFPIARTIST-27FEB28", "KXRANKLISTIFPIARTIST-27FEB28-BTS", "IFPI's biggest-selling global recording artist of 2026?", "BTS", 1216, 72, "Group origin"),
  musicMarket("KXRANKLISTIFPIARTIST-27FEB28", "KXRANKLISTIFPIARTIST-27FEB28-STR", "IFPI's biggest-selling global recording artist of 2026?", "Stray Kids", 43, 4, "Group origin"),
  musicMarket("KXRANKLISTIFPIARTIST-27FEB28", "KXRANKLISTIFPIARTIST-27FEB28-SEV", "IFPI's biggest-selling global recording artist of 2026?", "SEVENTEEN", 63, 1, "Group origin")
);

for (const bundle of musicBundles) {
  for (const market of bundle.markets) {
    market.horizon = bundle.horizon;
    market.markerCode = bundle.code;
  }
}

export const businessBundles = [...companyBundles, ...musicBundles]
  .sort((left, right) => Math.max(0, ...right.markets.map(market => market.volume)) - Math.max(0, ...left.markets.map(market => market.volume)));

export const businessHorizons = ["All", "United States", "International"];
