# LeadScout

SaaS-Portal für digitale KI-Mitarbeiter. Der erste digitale Mitarbeiter ist
der **Lead Scout**: er sucht nach passenden B2B-Zielkunden, bewertet sie
anhand eines Stellenprofils und stellt die Ergebnisse im Portal bereit.

## Architektur

Bewusste Entscheidung für dieses Projekt: **kein eigener Node.js-Server**,
weil der Code am Ende automatisch in ein Verzeichnis auf
`www.ringler-online.com` (klassisches IONOS-Hosting) deployt werden soll –
dort läuft kein Node-Prozess, nur statische Dateien.

```
Statische SPA (Vite + React + TypeScript, läuft komplett im Browser)
   ├─→ direkt zu Supabase (Auth, Datenbank-Lesen/Schreiben) — abgesichert durch Row Level Security
   └─→ zu 2 Supabase Edge Functions (die einzigen Stellen mit Secrets):
          1. trigger-lead-scout   – ruft den n8n-Webhook mit Secret auf
                                    (oder erzeugt Beispiel-Leads, falls kein n8n konfiguriert ist)
          2. lead-scout-callback  – empfängt Ergebnisse von n8n, prüft ein Secret, schreibt Leads

GitHub Actions baut die App bei jedem Push auf main und lädt sie
automatisch per SFTP in ein Verzeichnis auf ringler-online.com hoch.
```

Warum keine Server Actions/API-Routes (z. B. Next.js)? Die bräuchten einen
dauerhaft laufenden Node-Server. Supabase Edge Functions übernehmen exakt die
gleiche Aufgabe (Secrets sicher serverseitig halten), sind aber bei Supabase
selbst gehostet – es ist kein eigener Server nötig.

### Warum Hash-Routing (`/#/leads` statt `/leads`)

Die App ist eine Single-Page-Application. Ohne Serverkonfiguration kann ein
klassisches Shared-Hosting keine "sauberen" URLs für einzelne Seiten
ausliefern (ein Reload auf `/leads` würde einen 404 vom Webserver liefern).
`HashRouter` vermeidet das komplett, ohne dass am Hosting etwas
konfiguriert werden muss – auf Kosten des `#` in der URL.

## Tech-Stack

- Vite + React + TypeScript
- Tailwind CSS (v4) + eigene, schlanke UI-Komponenten (Button, Card, Badge, …)
- React Router (HashRouter)
- Supabase (Auth, Postgres, Row Level Security, Edge Functions)
- React Hook Form + Zod für Formulare/Validierung
- Resend für den täglichen E-Mail-Report
- n8n als externe Workflow-Engine (optional, siehe unten)

## Lokal starten

```bash
npm install
cp .env.example .env
# .env mit deinen Supabase-Projektdaten befüllen (siehe unten)
npm run dev
```

## Supabase-Projekt einrichten

1. Auf [supabase.com](https://supabase.com) ein neues (kostenloses) Projekt anlegen.
2. **SQL Editor** → Inhalt von `supabase/migrations/0001_init.sql` einfügen und ausführen.
   Legt alle Tabellen, Indizes, RLS-Policies und Hilfsfunktionen an.
3. **Authentication → Providers**: E-Mail/Passwort ist standardmäßig aktiv.
   Für den MVP empfiehlt es sich, **"Confirm email"** zunächst zu
   deaktivieren (Authentication → Settings), damit sich Nutzer nach der
   Registrierung sofort einloggen können. Das Portal funktioniert aber auch
   mit aktivierter Bestätigung – die Nutzer müssen dann nur zuerst ihre
   E-Mail bestätigen, bevor der Einrichtungsschritt für die Organisation
   erscheint.
4. **Project Settings → API**: `Project URL` und `anon public` Key in die
   `.env` übernehmen (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).

### Edge Functions deployen

Voraussetzung: [Supabase CLI](https://supabase.com/docs/guides/cli) installiert
und mit `supabase login` angemeldet.

```bash
supabase link --project-ref <dein-projekt-ref>

# Secrets setzen (ersetzen die .env für die Functions – niemals im Frontend!)
supabase secrets set \
  N8N_WEBHOOK_URL="" \
  N8N_WEBHOOK_SECRET="ein-zufälliges-secret" \
  LEAD_SCOUT_CALLBACK_SECRET="ein-weiteres-zufälliges-secret" \
  RESEND_API_KEY="dein-resend-key" \
  REPORT_FROM_ADDRESS="LeadScout <leadscout@ringler-online.com>" \
  REPORT_TRIGGER_SECRET="noch-ein-zufälliges-secret" \
  APP_URL="https://www.ringler-online.com/leadscout" \
  SALESVIEWER_API_KEY="dein-salesviewer-api-key"

supabase functions deploy trigger-lead-scout
# --no-verify-jwt: diese beiden Functions werden von Dritten (n8n) mit einem
# eigenen Secret aufgerufen, nicht mit einem Supabase-Login-Token. Ohne dieses
# Flag lehnt Supabase den Aufruf schon auf Plattform-Ebene mit
# "401 Invalid JWT" ab, bevor die Funktion überhaupt läuft.
supabase functions deploy lead-scout-callback --no-verify-jwt
supabase functions deploy send-daily-report --no-verify-jwt
supabase functions deploy sync-salesviewer-visitors
```

`SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY` müssen für Edge Functions
**nicht** manuell gesetzt werden – Supabase stellt sie automatisch als
Umgebungsvariablen bereit.

## Ohne n8n starten (Standard für den MVP)

Solange `N8N_WEBHOOK_URL` leer/nicht gesetzt ist, erzeugt
`trigger-lead-scout` beim Klick auf "Jetzt arbeiten lassen" realistische
Beispiel-Leads passend zum Stellenprofil und schreibt sie direkt in die
Datenbank – das Portal funktioniert damit von Anfang an vollständig, ganz
ohne n8n. Sobald ein echter n8n-Workflow bereitsteht, einfach
`N8N_WEBHOOK_URL` und `N8N_WEBHOOK_SECRET` per `supabase secrets set`
hinterlegen – am Portal-Code ändert sich nichts.

Der n8n-Workflow muss am Ende `lead-scout-callback`
(`https://<projekt-ref>.supabase.co/functions/v1/lead-scout-callback`) mit
`Authorization: Bearer <LEAD_SCOUT_CALLBACK_SECRET>` und dem im Prompt
beschriebenen JSON-Format aufrufen.

## Täglichen Report manuell auslösen

```bash
curl -X POST "https://<projekt-ref>.supabase.co/functions/v1/send-daily-report" \
  -H "Authorization: Bearer <REPORT_TRIGGER_SECRET>"
```

Verschickt an alle Organisationen mit hinterlegter Report-E-Mail einen
Report über die heute gefundenen Leads (überspringt Organisationen ohne
neue Leads). Für einen echten täglichen Rhythmus kann diese Function später
per Supabase Cron (`pg_cron` + `pg_net`) automatisch aufgerufen werden.

## Website-Besucher aus SalesViewer

Auf der Leads-Seite gibt es einen Button **"Website-Besuche abrufen"**, der
über die Edge Function `sync-salesviewer-visitors` erkannte Firmenbesuche der
letzten 7 Tage von [SalesViewer](https://www.salesviewer.com) abruft und als
zusätzliche Leads anlegt (Kennzeichnung "Quelle: Website-Besuch"). Diese Leads
haben keinen Score/keine KI-Begründung, da SalesViewer nur Besuchsdaten
liefert (Firma, Branche, Ort), keine Bewertung. Voraussetzung: Der API-Key aus
deinem SalesViewer-Konto (Menü "Projects & Tracking") muss als
`SALESVIEWER_API_KEY` gesetzt sein (siehe oben).

## Deployment nach ringler-online.com

`.github/workflows/deploy.yml` baut die App bei jedem Push auf `main` und
lädt `dist/` automatisch per SFTP (IONOS hat klassisches FTP inzwischen
abgeschaltet) in ein Verzeichnis auf IONOS hoch.

Einmalig einzurichten (GitHub → Repo → **Settings → Secrets and variables →
Actions**):

| Secret                  | Beschreibung                                      |
| ----------------------- | -------------------------------------------------- |
| `VITE_SUPABASE_URL`     | Supabase Project URL                                |
| `VITE_SUPABASE_ANON_KEY`| Supabase anon public Key                            |
| `IONOS_FTP_SERVER`      | SFTP-Host (z. B. `access-xxxxxxxx.webspace-host.com`) |
| `IONOS_FTP_USERNAME`    | SFTP-Benutzername                                   |
| `IONOS_FTP_PASSWORD`    | SFTP-Passwort                                       |
| `IONOS_FTP_TARGET_DIR`  | Zielverzeichnis, z. B. `/leadscout/` (optional, Default `/leadscout/`) |

Danach ist die App unter `https://www.ringler-online.com/leadscout/`
erreichbar.

## Datenbankmodell

Siehe `supabase/migrations/0001_init.sql`. Kurzüberblick:

- `organizations`, `profiles` – Mandanten und Nutzer
- `agents` – digitale Mitarbeiter (MVP: genau ein "Lead Scout" pro Organisation)
- `search_profiles` – Stellenprofil/Suchkriterien des Lead Scout
- `leads` – gefundene Zielkunden inkl. Score, Begründung, Quellen
- `agent_runs` – Verlauf aller Läufe (Status, Trefferzahlen, Fehler)
- `lead_feedback` – Relevant/Nicht-relevant-Feedback der Nutzer

Mandantentrennung erfolgt ausschließlich über Postgres Row Level Security
(`organization_id = current_organization_id()`), nicht über Anwendungscode.

## Nächste Schritte (bewusst nicht Teil des MVP)

- Automatischer täglicher Lauf per Supabase Cron statt manuellem Button
- Automatischer täglicher E-Mail-Versand per Supabase Cron
- Weitere digitale Mitarbeiter neben dem Lead Scout
- Sauberere URLs per Server-Rewrite, falls das Hosting später doch
  Apache-`.htaccess`-Regeln zulässt
