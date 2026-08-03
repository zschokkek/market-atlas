import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schedulesPath = path.join(repository, "data", "americas-soccer-schedules-2026.json");
const sourcePath = path.join(repository, "data", "mls-fixtures-source-2026.json");

const venues = {
  "Allianz Field": [44.953, -93.1656, "Saint Paul, MN"],
  "America First Field": [40.5829, -111.8933, "Sandy, UT"],
  "Audi Field": [38.8687, -77.0129, "Washington, D.C."],
  "BC Place": [49.2768, -123.1119, "Vancouver, Canada"],
  "BMO Field": [43.6332, -79.4186, "Toronto, Canada"],
  "BMO Stadium": [34.0128, -118.2846, "Los Angeles, CA"],
  "Bank of America Stadium": [35.2258, -80.8528, "Charlotte, NC"],
  "Citi Field": [40.7571, -73.8458, "New York, NY"],
  "DICK'S Sporting Goods Park": [39.8057, -104.8919, "Commerce City, CO"],
  "Dignity Health Sports Park": [33.8644, -118.2611, "Carson, CA"],
  "Empower Field at Mile High": [39.7439, -105.0201, "Denver, CO"],
  "Energizer Park": [38.6312, -90.2102, "St. Louis, MO"],
  "GEODIS Park": [36.1304, -86.7656, "Nashville, TN"],
  "Gillette Stadium": [42.0909, -71.2643, "Foxborough, MA"],
  "Inter Miami CF Stadium": [26.1931, -80.1609, "Fort Lauderdale, FL"],
  "Inter&Co Stadium": [28.5411, -81.3894, "Orlando, FL"],
  "Inter.co Stadium": [28.5411, -81.3894, "Orlando, FL"],
  "Levi's Stadium": [37.403, -121.97, "Santa Clara, CA"],
  "Los Angeles Memorial Coliseum": [34.0141, -118.2879, "Los Angeles, CA"],
  "Lumen Field": [47.5952, -122.3316, "Seattle, WA"],
  "M&T Bank Stadium": [39.278, -76.6227, "Baltimore, MD"],
  "Mercedes-Benz Stadium": [33.7554, -84.4008, "Atlanta, GA"],
  "Nu Stadium": [25.7967, -80.2579, "Miami, FL"],
  "PayPal Park": [37.3512, -121.9255, "San Jose, CA"],
  "Providence Park": [45.5215, -122.6918, "Portland, OR"],
  "Q2 Stadium": [30.388, -97.7199, "Austin, TX"],
  "ScottsMiracle-Gro Field": [39.9685, -83.0171, "Columbus, OH"],
  "SeatGeek Stadium": [41.7647, -87.8061, "Bridgeview, IL"],
  "Shell Energy Stadium": [29.7522, -95.3524, "Houston, TX"],
  "Snapdragon Stadium": [32.784, -117.1225, "San Diego, CA"],
  "Soldier Field": [41.8623, -87.6167, "Chicago, IL"],
  "Sporting Park": [39.1215, -94.8233, "Kansas City, KS"],
  "Sports Illustrated Stadium": [40.7368, -74.1503, "Harrison, NJ"],
  "Stade Saputo": [45.5631, -73.5525, "Montreal, Canada"],
  "Stanford Stadium": [37.4345, -122.1611, "Stanford, CA"],
  "Subaru Park": [39.8328, -75.3785, "Chester, PA"],
  "TQL Stadium": [39.1113, -84.5161, "Cincinnati, OH"],
  "Toyota Stadium": [33.1543, -96.8352, "Frisco, TX"],
  "Yankee Stadium": [40.8296, -73.9262, "New York, NY"]
};

const homeGeography = {
  "Atlanta United": venues["Mercedes-Benz Stadium"],
  "Austin FC": venues["Q2 Stadium"],
  "CF Montréal": venues["Stade Saputo"],
  "Charlotte FC": venues["Bank of America Stadium"],
  "Chicago Fire FC": venues["Soldier Field"],
  "Colorado Rapids": venues["DICK'S Sporting Goods Park"],
  "Columbus Crew": venues["ScottsMiracle-Gro Field"],
  "D.C. United": venues["Audi Field"],
  "FC Cincinnati": venues["TQL Stadium"],
  "FC Dallas": venues["Toyota Stadium"],
  "Houston Dynamo FC": venues["Shell Energy Stadium"],
  "Inter Miami CF": venues["Nu Stadium"],
  "LA Galaxy": venues["Dignity Health Sports Park"],
  "Los Angeles Football Club": venues["BMO Stadium"],
  "Minnesota United FC": venues["Allianz Field"],
  "Nashville SC": venues["GEODIS Park"],
  "New England Revolution": venues["Gillette Stadium"],
  "New York City Football Club": venues["Yankee Stadium"],
  "Orlando City": venues["Inter&Co Stadium"],
  "Philadelphia Union": venues["Subaru Park"],
  "Portland Timbers": venues["Providence Park"],
  "Real Salt Lake": venues["America First Field"],
  "Red Bull New York": venues["Sports Illustrated Stadium"],
  "San Diego FC": venues["Snapdragon Stadium"],
  "San Jose Earthquakes": venues["PayPal Park"],
  "Seattle Sounders FC": venues["Lumen Field"],
  "Sporting Kansas City": venues["Sporting Park"],
  "St. Louis CITY SC": venues["Energizer Park"],
  "Toronto FC": venues["BMO Field"],
  "Vancouver Whitecaps FC": venues["BC Place"]
};

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const easternFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "numeric",
  minute: "2-digit",
  hour12: true
});

function easternParts(utc) {
  const values = Object.fromEntries(easternFormatter.formatToParts(new Date(utc)).map(part => [part.type, part.value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    label: `${monthNames[Number(values.month) - 1]} ${Number(values.day)} · ${values.hour}:${values.minute} ${values.dayPeriod} ET`
  };
}

const schedules = JSON.parse(fs.readFileSync(schedulesPath, "utf8"));
const fixtures = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const events = fixtures.map(fixture => {
  const utc = fixture.DateUtc.replace(" ", "T");
  const date = easternParts(utc);
  const geography = venues[fixture.Location] || homeGeography[fixture.HomeTeam];
  if (!geography) throw new Error(`No MLS geography for ${fixture.Location} / ${fixture.HomeTeam}`);
  return {
    id: String(fixture.MatchNumber),
    date: date.date,
    utc,
    dates: `Matchday ${fixture.RoundNumber} · ${date.label}`,
    home: fixture.HomeTeam,
    away: fixture.AwayTeam,
    venue: fixture.Location === "TBC" ? "Venue TBC" : fixture.Location,
    city: geography[2],
    lat: geography[0],
    lon: geography[1]
  };
}).sort((left, right) => left.utc.localeCompare(right.utc) || Number(left.id) - Number(right.id));

if (events.length !== 510) throw new Error(`Expected 510 MLS matches, received ${events.length}`);
if (new Set(events.map(event => event.id)).size !== events.length) throw new Error("MLS match IDs must be unique");

schedules.MLS = {
  label: "Major League Soccer",
  series: "KXMLSGAME",
  source: "FixtureDownload MLS 2026 (official MLS schedule cross-check)",
  events
};

fs.writeFileSync(schedulesPath, `${JSON.stringify(schedules)}\n`);
console.log(`MLS: ${events.length} events`);
console.log(schedulesPath);
