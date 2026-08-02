const market = (id, title, eventTicker, volume, url, outcomes, kind = null, horizon = null) => ({
  id, title, eventTicker, volume, url, kind, horizon, outcomes: outcomes.map(([name, price]) => ({ name, price }))
});

const bundle = (id, name, code, location, lat, lon, kind, horizon, markets) => ({
  id, name, code, location, lat, lon, kind, horizon, markets
});

// Verified against Kalshi's public Climate pages on 2026-08-02. This is the
// bootstrap registry; the next weather iteration can replace prices through a
// cached /api/weather feed without changing the map's rendering contract.
export const weatherBundles = [
  bundle("los-angeles", "Los Angeles", "80°", "Los Angeles, California", 34.0522, -118.2437, "Temperature", "Today", [
    market("KXHIGHLAX-26AUG02", "Highest temperature in LA today?", "KXHIGHLAX-26AUG02", 173064, "https://kalshi.com/markets/kxhighlax/highest-temperature-in-los-angeles/kxhighlax-26aug02", [["77° or below", 1], ["78° to 79°", 43], ["80° to 81°", 51], ["82° to 83°", 6], ["84° to 85°", 1], ["86° or above", 1]])
  ]),
  bundle("miami", "Miami", "90°", "Miami, Florida", 25.7617, -80.1918, "Temperature", "Today", [
    market("KXHIGHMIA-26AUG02", "Highest temperature in Miami today?", "KXHIGHMIA-26AUG02", 48858, "https://kalshi.com/markets/kxhighmia/highest-temperature-in-miami/kxhighmia-26aug02", [["87° or below", 9], ["88° to 89°", 22], ["90° to 91°", 52], ["92° to 93°", 19], ["94° to 95°", 3], ["96° or above", 1]])
  ]),
  bundle("new-york", "New York City", "82°", "New York, New York", 40.7128, -74.006, "Temperature", "Today", [
    market("KXHIGHNY-26AUG02", "Highest temperature in NYC today?", "KXHIGHNY-26AUG02", 43375, "https://kalshi.com/markets/kxhighny/highest-temperature-in-nyc/kxhighny-26aug02", [["79° or below", 3], ["80° to 81°", 28], ["82° to 83°", 50], ["84° to 85°", 20], ["86° to 87°", 4], ["88° or above", 1]]),
    market("KXRAIN-26AUG02-NYC", "Will it rain in New York City today?", "KXRAIN-26AUG02-NYC", 59200, "https://kalshi.com/markets/kxrain/where-will-it-rain-daily/kxrain-26aug02", [["Yes", 72], ["No", 28]], "Rain & Snow", "Today")
  ]),
  bundle("san-francisco", "San Francisco", "78°", "San Francisco, California", 37.7749, -122.4194, "Temperature", "Today", [
    market("KXHIGHTSFO-26AUG02", "Highest temperature in San Francisco today?", "KXHIGHTSFO-26AUG02", 21413, "https://kalshi.com/markets/kxhightsfo/san-francisco-high-temperature-daily/kxhightsfo-26aug02", [["73° or below", 6], ["74° to 75°", 5], ["76° to 77°", 19], ["78° to 79°", 44], ["80° to 81°", 20], ["82° or above", 6]])
  ]),
  bundle("atlanta", "Atlanta", "47%", "Atlanta, Georgia", 33.749, -84.388, "Rain & Snow", "Today", [
    market("KXRAIN-26AUG02-ATL", "Will it rain in Atlanta today?", "KXRAIN-26AUG02-ATL", 59200, "https://kalshi.com/markets/kxrain/where-will-it-rain-daily/kxrain-26aug02", [["Yes", 47], ["No", 53]], "Rain & Snow", "Today"),
    market("KXHIGHTATL-26AUG02", "Highest temperature in Atlanta today?", "KXHIGHTATL-26AUG02", 21273, "https://kalshi.com/markets/kxhightatl/atlanta-max-temperature/kxhightatl-26aug02", [["89° to 90°", 37], ["87° to 88°", 29], ["Other", 34]], "Temperature", "Today")
  ]),
  bundle("boston", "Boston", "30%", "Boston, Massachusetts", 42.3601, -71.0589, "Rain & Snow", "Today", [
    market("KXRAIN-26AUG02-BOS", "Will it rain in Boston today?", "KXRAIN-26AUG02-BOS", 59200, "https://kalshi.com/markets/kxrain/where-will-it-rain-daily/kxrain-26aug02", [["Yes", 30], ["No", 70]], "Rain & Snow", "Today"),
    market("KXHIGHTBOS-26AUG02", "Highest temperature in Boston today?", "KXHIGHTBOS-26AUG02", 9179, "https://kalshi.com/markets/kxhightbos/boston-maximum-daily-temperature/kxhightbos-26aug02", [["85° to 86°", 48], ["83° to 84°", 26], ["Other", 26]], "Temperature", "Today")
  ]),
  bundle("chicago", "Chicago", "75°", "Chicago, Illinois", 41.8781, -87.6298, "Temperature", "Today", [
    market("KXHIGHCHI-26AUG02", "Highest temperature in Chicago today?", "KXHIGHCHI-26AUG02", 18641, "https://kalshi.com/markets/kxhighchi/highest-temperature-in-chicago/kxhighchi-26aug02", [["70° or below", 1], ["71° to 72°", 2], ["73° to 74°", 14], ["75° to 76°", 39], ["77° to 78°", 39], ["79° or above", 11]])
  ]),
  bundle("phoenix", "Phoenix", "115°", "Phoenix, Arizona", 33.4484, -112.074, "Temperature", "Today", [
    market("KXHIGHTPHX-26AUG02", "Highest temperature in Phoenix today?", "KXHIGHTPHX-26AUG02", 18286, "https://kalshi.com/markets/kxhightphx/phoenix-high-temperature-daily/kxhightphx-26aug02", [["110° or below", 1], ["111° to 112°", 5], ["113° to 114°", 30], ["115° to 116°", 63], ["117° to 118°", 6], ["119° or above", 2]])
  ]),
  bundle("austin", "Austin", "99°", "Austin, Texas", 30.2672, -97.7431, "Temperature", "Today", [
    market("KXHIGHAUS-26AUG02", "Highest temperature in Austin today?", "KXHIGHAUS-26AUG02", 15594, "https://kalshi.com/markets/kxhighaus/highest-temperature-in-austin/kxhighaus-26aug02", [["98° or below", 23], ["99° to 100°", 55], ["101° to 102°", 17], ["103° to 104°", 2], ["105° to 106°", 1], ["107° or above", 1]])
  ]),
  bundle("philadelphia", "Philadelphia", "89°", "Philadelphia, Pennsylvania", 39.9526, -75.1652, "Temperature", "Today", [
    market("KXHIGHPHIL-26AUG02", "Highest temperature in Philadelphia today?", "KXHIGHPHIL-26AUG02", 24695, "https://kalshi.com/markets/kxhighphil/highest-temperature-in-philadelphia/kxhighphil-26aug02", [["89° to 90°", 52], ["87° to 88°", 33], ["Other", 15]], "Temperature", "Today"),
    market("KXLOWTPHIL-26AUG02", "Lowest temperature in Philadelphia today?", "KXLOWTPHIL-26AUG02", 5100, "https://kalshi.com/markets/kxlowtphil/lowest-temperature-in-philadelphia/kxlowtphil-26aug02", [["68° to 69°", 51], ["66° to 67°", 31], ["Other", 18]], "Temperature", "Today")
  ]),
  bundle("denver", "Denver", "101°", "Denver, Colorado", 39.7392, -104.9903, "Temperature", "Today", [
    market("KXHIGHDEN-26AUG03", "Highest temperature in Denver on Aug 3?", "KXHIGHDEN-26AUG03", 434, "https://kalshi.com/markets/kxhighden/highest-temperature-in-denver/kxhighden-26aug03", [["94° or below", 1], ["97° to 98°", 6], ["99° to 100°", 24], ["101° to 102°", 33], ["103° or above", 27]], "Temperature", "Today")
  ]),
  bundle("washington-dc", "Washington, D.C.", "87°", "Washington, D.C.", 38.9072, -77.0369, "Temperature", "Today", [
    market("KXHIGHTDC-26AUG03", "Highest temperature in Washington DC on Aug 3?", "KXHIGHTDC-26AUG03", 338, "https://kalshi.com/markets/kxhightdc/washington-dc-daily-max-temp/kxhightdc-26aug03", [["84° or below", 2], ["85° to 86°", 17], ["87° to 88°", 37], ["89° to 90°", 36], ["91° or above", 9]], "Temperature", "Today")
  ]),
  bundle("seattle", "Seattle", "77°", "Seattle, Washington", 47.6062, -122.3321, "Temperature", "Today", [
    market("KXHIGHTSEA-26AUG03", "Highest temperature in Seattle on Aug 3?", "KXHIGHTSEA-26AUG03", 359, "https://kalshi.com/markets/kxhightsea/seattle-maximum-temperature-daily/kxhightsea-26aug03", [["74° or below", 7], ["75° to 76°", 15], ["77° to 78°", 36], ["79° to 80°", 28], ["81° or above", 17]], "Temperature", "Today")
  ]),
  bundle("dallas", "Dallas", "100°", "Dallas, Texas", 32.7767, -96.797, "Temperature", "Today", [
    market("KXHIGHTDAL-26AUG03", "Highest temperature in Dallas on Aug 3?", "KXHIGHTDAL-26AUG03", 1344, "https://kalshi.com/markets/kxhightdal/dallas-maximum-temperature/kxhightdal-26aug03", [["97° or below", 4], ["98° to 99°", 27], ["100° to 101°", 48], ["102° to 103°", 12], ["104° or above", 7]], "Temperature", "Today")
  ]),
  bundle("minneapolis", "Minneapolis", "85°", "Minneapolis, Minnesota", 44.9778, -93.265, "Temperature", "Today", [
    market("KXHIGHTMIN-26AUG03", "Highest temperature in Minneapolis on Aug 3?", "KXHIGHTMIN-26AUG03", 56, "https://kalshi.com/markets/kxhightmin/minneapolis-daily-high-temperature/kxhightmin-26aug03", [["82° or below", 5], ["83° to 84°", 17], ["85° to 86°", 32], ["87° to 88°", 30], ["89° or above", 15]], "Temperature", "Today")
  ]),
  bundle("houston", "Houston", "97°", "Houston, Texas", 29.7604, -95.3698, "Temperature", "Today", [
    market("KXHIGHTHOU-26AUG03", "Highest temperature in Houston on Aug 3?", "KXHIGHTHOU-26AUG03", 538, "https://kalshi.com/markets/kxhighthou/daily-high-temperature-houston/kxhighthou-26aug03", [["96° or below", 22], ["97° to 98°", 55], ["99° to 100°", 22], ["101° or above", 3]], "Temperature", "Today")
  ]),
  bundle("new-orleans", "New Orleans", "94°", "New Orleans, Louisiana", 29.9511, -90.0715, "Temperature", "Today", [
    market("KXHIGHTNOLA-26AUG03", "Highest temperature in New Orleans on Aug 3?", "KXHIGHTNOLA-26AUG03", 510, "https://kalshi.com/markets/kxhightnola/new-orleans-max-temp-daily/kxhightnola-26aug03", [["91° or below", 1], ["92° to 93°", 1], ["94° to 95°", 38], ["96° to 97°", 5], ["98° or above", 4]], "Temperature", "Today")
  ]),
  bundle("san-antonio", "San Antonio", "99°", "San Antonio, Texas", 29.4241, -98.4936, "Temperature", "Today", [
    market("KXHIGHTSATX-26AUG03", "Highest temperature in San Antonio on Aug 3?", "KXHIGHTSATX-26AUG03", 803, "https://kalshi.com/markets/kxhightsatx/san-antonio-daily-maximum-temperature/kxhightsatx-26aug03", [["98° or below", 21], ["99° to 100°", 48], ["101° to 102°", 31], ["103° or above", 6]], "Temperature", "Today")
  ]),
  bundle("oklahoma-city", "Oklahoma City", "98°", "Oklahoma City, Oklahoma", 35.4676, -97.5164, "Temperature", "Today", [
    market("KXHIGHTOKC-26AUG03", "Highest temperature in Oklahoma City on Aug 3?", "KXHIGHTOKC-26AUG03", 18, "https://kalshi.com/markets/kxhightokc/oklahoma-city-maximum-high-temperature/kxhightokc-26aug03", [["96° to 97°", 15], ["98° to 99°", 37], ["100° to 101°", 32], ["102° or above", 13]], "Temperature", "Today")
  ]),
  bundle("atlantic", "Atlantic Basin", "49%", "Tropical Atlantic", 24, -55, "Hurricanes", "Season", [
    market("KXFIRSTHURRICANE-26DEC01ATL", "Name of the first Atlantic hurricane this year?", "KXFIRSTHURRICANE-26DEC01ATL", 320433, "https://kalshi.com/markets/kxfirsthurricane/first-hurricane/kxfirsthurricane-26dec01atl", [["Cristobal", 49], ["Dolly", 28], ["Edouard", 20]]),
    market("KXATLMAJORHURRICANES-26", "How many major Atlantic hurricanes this year?", "KXATLMAJORHURRICANES-26", 60600, "https://kalshi.com/category/climate/hurricanes", [["Above 1", 60], ["Above 2", 39]])
  ]),
  bundle("central-pacific", "Central Pacific", "56%", "Central Pacific basin", 18, -155, "Hurricanes", "Season", [
    market("KXCPACHURRICANES-26", "How many major Central Pacific hurricanes this year?", "KXCPACHURRICANES-26", 368, "https://kalshi.com/category/climate/hurricanes", [["Above 1", 56], ["Above 0", 82]])
  ]),
  bundle("california-quake", "California", "5%", "San Andreas Fault, California", 36.6, -121.2, "Natural Disasters", "Long range", [
    market("KXEARTHQUAKECALIFORNIA-27", "8 magnitude earthquake in California before 2027?", "KXEARTHQUAKECALIFORNIA-27", 355099, "https://kalshi.com/markets/kxearthquakecalifornia/earthquake-in-california/kxearthquakecalifornia-27", [["Yes", 5], ["No", 95]])
  ]),
  bundle("japan-quake", "Japan", "42%", "Japan", 36.2048, 138.2529, "Natural Disasters", "Long range", [
    market("KXEARTHQUAKEJAPAN-30", "8 magnitude earthquake in Japan before 2030?", "KXEARTHQUAKEJAPAN-30", 42379, "https://kalshi.com/markets/kxearthquakejapan/earthquake-in-japan/kxearthquakejapan-30", [["Yes", 42], ["No", 58]])
  ]),
  bundle("global-temperature", "Global Temperature", "44%", "Global climate index", 0, -15, "Climate Change", "2026", [
    market("KXGTEMP-26", "Will 2026 be the hottest year ever?", "KXGTEMP-26", 248837, "https://kalshi.com/markets/kxgtemp/hottest-year-ever/kxgtemp-26", [["Yes", 44], ["No", 56]])
  ]),
  bundle("arctic-ice", "Arctic Sea Ice", "57%", "Arctic Ocean", 78, 0, "Climate Change", "2026", [
    market("KXARCTICICEMIN-26OCT01", "Lowest daily Arctic sea ice extent in summer 2026", "KXARCTICICEMIN-26OCT01", 1105, "https://kalshi.com/markets/kxarcticicemin/arctic-sea-ice-min-extent/kxarcticicemin-26oct01", [["Below 4.4M sq km", 69], ["Below 4.3M sq km", 57], ["Below 4.2M sq km", 46]])
  ]),
  bundle("eu-climate", "European Union", "46%", "Brussels, Belgium", 50.8503, 4.3517, "Climate Change", "Long range", [
    market("EUCLIMATE", "EU meets its 2030 climate goals?", "EUCLIMATE", 3599, "https://kalshi.com/markets/kxeuclimate/eu-hits-climate-goals/euclimate", [["Yes", 46], ["No", 54]])
  ]),
  bundle("india-climate", "India", "68%", "New Delhi, India", 28.6139, 77.209, "Climate Change", "Long range", [
    market("INDIACLIMATE-30", "India meets its 2030 climate goals?", "INDIACLIMATE-30", 11590, "https://kalshi.com/markets/kxindiaclimate/india-climate-goals/indiaclimate-30", [["Yes", 68], ["No", 32]])
  ])
];

export const weatherHorizons = ["All", "Today", "Season", "2026", "Long range"];
