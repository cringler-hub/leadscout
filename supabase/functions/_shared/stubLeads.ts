// Erzeugt realistische Beispiel-Leads, solange kein echter n8n-Workflow
// konfiguriert ist (N8N_WEBHOOK_URL leer). Nutzt die Werte aus dem
// Stellenprofil, damit die Ergebnisse zum Suchprofil passen.

interface Profile {
  industries: string[]
  regions: string[]
  targetRoles: string[]
  buyingSignals: string[]
  maxLeadsPerRun: number
}

const sampleCompanySuffixes = ['GmbH', 'AG', 'Systeme GmbH', 'Automation AG', 'Werke GmbH']
const sampleCityFallback = ['Wien', 'München', 'Stuttgart', 'Nürnberg', 'Zürich']

function pick<T>(list: T[], fallback: T): T {
  if (list.length === 0) return fallback
  return list[Math.floor(Math.random() * list.length)]
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function generateStubLeads(profile: Profile) {
  const count = Math.min(profile.maxLeadsPerRun || 5, 8)
  const leads = []

  for (let i = 0; i < count; i++) {
    const industry = pick(profile.industries, 'Maschinenbau')
    const region = pick(profile.regions, pick(sampleCityFallback, 'Wien'))
    const role = pick(profile.targetRoles, 'Head of Sales')
    const signal = pick(profile.buyingSignals, 'Neue Niederlassung')
    const employeeCount = randomInt(50, 500)
    const score = randomInt(60, 96)
    const suffix = pick(sampleCompanySuffixes, 'GmbH')
    const companyName = `${industry.split(' ')[0]} ${suffix} ${randomInt(1, 99)}`

    leads.push({
      companyName,
      website: `https://www.${companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.example`,
      industry,
      location: region,
      employeeCount,
      estimatedRevenue: employeeCount * randomInt(80_000, 200_000),
      leadScore: score,
      scoreDetails: {
        industryFit: randomInt(15, 25),
        companySizeFit: randomInt(10, 20),
        regionFit: randomInt(5, 10),
        buyingSignalFit: randomInt(15, 25),
        needFit: randomInt(5, 15),
        contactability: randomInt(3, 10),
      },
      reasoning: `${companyName} passt gut zum Suchprofil: ${industry} in ${region} mit ${employeeCount} Mitarbeitenden.`,
      buyingSignals: [signal],
      recommendedRole: role,
      conversationTrigger: signal,
      sourceUrls: [`https://www.${companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.example/news`],
    })
  }

  return leads
}
