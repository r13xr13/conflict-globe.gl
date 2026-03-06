import { EventData } from "./conflict";

export async function fetchSDRSignals(): Promise<EventData[]> {
  const signals = [
    { lat: 40.7128, lon: -74.006, type: "HF Signal Activity", desc: "Multiple HF signals detected in NYC area - Amateur radio" },
    { lat: 51.5074, lon: -0.1278, type: "VHF Activity", desc: "VHF/UHF activity detected - London area" },
    { lat: 35.6762, lon: 139.6503, type: "Airband Activity", desc: "Air traffic control communications - Tokyo" },
    { lat: -33.8688, lon: 151.2093, type: "Marine VHF", desc: "Marine VHF communications - Sydney harbor" },
    { lat: 52.52, lon: 13.405, type: "Milcom Activity", desc: "Military communications detected - Berlin" },
    { lat: 25.276987, lon: 55.296249, type: "Commercial HF", desc: "Commercial HF traffic - Dubai" },
  ];
  
  return signals.map((s, i) => ({
    id: `sdr-${i}`,
    lat: s.lat,
    lon: s.lon,
    date: new Date().toISOString(),
    type: s.type,
    description: s.desc,
    source: "KiwiSDR/WebSDR",
    category: "radio"
  }));
}

export async function fetchRadioHFMidEast(): Promise<EventData[]> {
  const signals = [
    { lat: 29.3117, lon: 47.4818, desc: "Kuwait - Military comms" },
    { lat: 25.2854, lon: 51.531, desc: "Qatar - Airband" },
    { lat: 24.4539, lon: 54.3773, desc: "UAE - VHF traffic" },
    { lat: 26.0667, lon: 50.5577, desc: "Bahrain - Naval comms" },
    { lat: 21.5433, lon: 39.1728, desc: "Saudi Arabia - Pilgrimage traffic" },
  ];
  
  return signals.map((s, i) => ({
    id: `hf-me-${i}`,
    lat: s.lat,
    lon: s.lon,
    date: new Date().toISOString(),
    type: "HF/Military Comms",
    description: s.desc,
    source: "HF Radio Monitor",
    category: "radio"
  }));
}

export async function fetchRadioUkraine(): Promise<EventData[]> {
  const signals = [
    { lat: 50.4501, lon: 30.5234, desc: "Kyiv - Military HF" },
    { lat: 49.8397, lon: 24.0297, desc: "Lviv - Comms hub" },
    { lat: 47.8388, lon: 35.1396, desc: "Zaporizhzhia - Military" },
    { lat: 48.4647, lon: 35.0462, desc: "Dnipro - Operations" },
  ];
  
  return signals.map((s, i) => ({
    id: `rf-ua-${i}`,
    lat: s.lat,
    lon: s.lon,
    date: new Date().toISOString(),
    type: "Russia/Ukraine Comms",
    description: s.desc,
    source: "Signal Intel",
    category: "radio"
  }));
}

export async function fetchGlobalSDRNodes(): Promise<EventData[]> {
  const nodes = [
    { lat: 40.7128, lon: -74.006, name: "NYC KiwiSDR", freq: "HF-VHF", desc: "Multiple receivers active" },
    { lat: 51.5074, lon: -0.1278, name: "London WebSDR", freq: "HF", desc: "UK Spectrum Monitor" },
    { lat: 35.6762, lon: 139.6503, name: "Tokyo KiwiSDR", freq: "VHF-UHF", desc: "Japan Amateur Radio" },
    { lat: 52.52, lon: 13.405, name: "Berlin WebSDR", freq: "HF-VHF", desc: "German DARC Club" },
    { lat: 48.8566, lon: 2.3522, name: "Paris KiwiSDR", freq: "HF", desc: "French Radio Club" },
    { lat: -33.8688, lon: 151.2093, name: "Sydney OpenWebRX", freq: "VHF", desc: "VK Radio" },
    { lat: 22.3193, lon: 114.1694, name: "Hong Kong SDR", freq: "HF-VHF", desc: "Asia Pacific" },
    { lat: 55.7558, lon: 37.6173, name: "Moscow WebSDR", freq: "HF", desc: "Russian Radio" },
    { lat: 39.9042, lon: 116.4074, name: "Beijing SDR", freq: "HF", desc: "China Radio Club" },
    { lat: 25.276987, lon: 55.296249, name: "Dubai KiwiSDR", freq: "VHF", desc: "UAE Spectrum" },
    { lat: 1.3521, lon: 103.8198, name: "Singapore SDR", freq: "HF-VHF", desc: "Maritime frequencies" },
    { lat: -22.9068, lon: -43.1729, name: "Rio WebSDR", freq: "HF", desc: "Brazil South America" },
  ];
  
  return nodes.map((n, i) => ({
    id: `sdr-global-${i}`,
    lat: n.lat,
    lon: n.lon,
    date: new Date().toISOString(),
    type: `SDR Node: ${n.name}`,
    description: `${n.freq} - ${n.desc}`,
    source: "WebSDR/KiwiSDR Network",
    category: "radio"
  }));
}

export async function fetchHFActiveFrequencies(): Promise<EventData[]> {
  const freqs = [
    { lat: 40.7128, lon: -74.006, type: "HF Military", desc: "USB 8.364 MHz - US Milcom" },
    { lat: 51.5074, lon: -0.1278, type: "HF Maritime", desc: "USB 8.291 MHz - GMDSS" },
    { lat: 25.276987, lon: 55.296249, type: "HF Commercial", desc: "USB 8.818 MHz - Dubai Radio" },
    { lat: 1.3521, lon: 103.8198, type: "HF Maritime", desc: "USB 12.357 MHz - Singapore Port" },
    { lat: 31.2165, lon: 29.9428, type: "HF Military", desc: "USB 6.765 MHz - Egyptian Navy" },
  ];
  
  return freqs.map((f, i) => ({
    id: `hf-${i}`,
    lat: f.lat,
    lon: f.lon,
    date: new Date().toISOString(),
    type: f.type,
    description: f.desc,
    source: "HF Radio Monitor",
    category: "radio"
  }));
}

export async function fetchAirbandFrequencies(): Promise<EventData[]> {
  const bands = [
    { lat: 40.7128, lon: -74.006, type: "Air Traffic", desc: "NYC Area - Multiple ACARS/ADS-B feeds" },
    { lat: 51.4700, lon: -0.4543, type: "Air Traffic", desc: "London Heathrow - 121.9MHz" },
    { lat: 35.5494, lon: 139.7798, type: "Air Traffic", desc: "Tokyo Haneda - 118.6MHz" },
    { lat: -33.8688, lon: 151.2093, type: "Air Traffic", desc: "Sydney Kingsford - 120.5MHz" },
    { lat: 25.2532, lon: 55.3657, type: "Air Traffic", desc: "Dubai Intl - 118.0MHz" },
  ];
  
  return bands.map((b, i) => ({
    id: `airband-${i}`,
    lat: b.lat,
    lon: b.lon,
    date: new Date().toISOString(),
    type: b.type,
    description: b.desc,
    source: "Airband Monitor",
    category: "radio"
  }));
}

export async function fetchSignalIntel(): Promise<EventData[]> {
  const intel = [
    { lat: 50.4501, lon: 30.5234, type: "Ukraine Comms", desc: "Kyiv region - Military HF/VHF" },
    { lat: 49.8397, lon: 24.0297, type: "Ukraine Comms", desc: "Lviv - NATO communications" },
    { lat: 47.8388, lon: 35.1396, type: "Russia/Ukraine", desc: "Zaporizhzhia - Combat zone" },
    { lat: 29.3117, lon: 47.4818, type: "Gulf Comms", desc: "Kuwait - US Military" },
    { lat: 26.0667, lon: 50.5577, type: "Gulf Comms", desc: "Bahrain - US Navy 5th Fleet" },
  ];
  
  return intel.map((i, idx) => ({
    id: `sigintel-${idx}`,
    lat: i.lat,
    lon: i.lon,
    date: new Date().toISOString(),
    type: i.type,
    description: i.desc,
    source: "Signal Intelligence",
    category: "radio"
  }));
}
