# India AQI Dashboard

## Prerequisites

- The system default `node` (v16) is too old for this project's Vite/React setup. Use `node@23` (installed via brew but not linked globally) by prefixing commands with its PATH, as shown below.
- The pipeline runs on Python 3.13 via a venv already set up at `dashboard/pipeline/.venv`.

## 1. Run the data pipeline

Processes `json_data/*.json` into the static JSON the dashboard reads from (`dashboard/public/data/`).

```sh
cd dashboard/pipeline
.venv/bin/python run_pipeline.py
```

- Full runs are incremental: source files already folded into `pipeline/.cache/pipeline.db` (SQLite) are skipped, so only new/changed files get re-parsed.
- For a quick verification run over a small sample instead of the full corpus:

  ```sh
  .venv/bin/python run_pipeline.py --sample-n 50
  ```

  (Sample runs are fully in-memory and never touch the persisted cache or mark files as processed.)

- Run the pipeline's test suite:

  ```sh
  .venv/bin/python -m pytest
  ```

## 2. Run the dashboard UI

```sh
cd dashboard
PATH="/usr/local/opt/node@23/bin:$PATH" npm run dev
```

Other commands (same PATH prefix):

```sh
PATH="/usr/local/opt/node@23/bin:$PATH" npm run build     # type-check + production build
PATH="/usr/local/opt/node@23/bin:$PATH" npm run preview    # serve the production build locally
PATH="/usr/local/opt/node@23/bin:$PATH" npm run lint       # oxlint
```

## 3. Automated hosting (GitHub Actions + Cloudflare Pages)

`.github/workflows/update.yml` runs every 2 hours on GitHub's servers with no local machine involved:

1. `scripts/fetch.sh` pulls one snapshot from data.gov.in (key in the `DATA_GOV_API_KEY` repo secret). Empty responses are skipped; an unreachable API fails the run. This step runs on the Raspberry Pi (see below) and hands the snapshot to the rest of the workflow.
2. `scripts/state.sh restore` downloads `pipeline.db.gz` plus the previous and current month's raw snapshots from the `data` release.
3. `scripts/state.sh save-month` re-packs this month's archive with the new snapshot.
4. `run_pipeline.py` folds in the new file, `npm run build` rebuilds, and wrangler deploys `dashboard/dist` to Cloudflare Pages (`india-aqi`).
5. `scripts/state.sh save-db` uploads the updated `pipeline.db.gz`.

The `data` release is also the permanent raw archive: `aqi-YYYY-MM.tar.xz` holds every snapshot for that month.

```sh
gh release download data --pattern 'aqi-2025-01.tar.xz'
mkdir -p json_data && tar -xJf aqi-2025-01.tar.xz -C json_data
```

Required repo secrets: `DATA_GOV_API_KEY`, `CLOUDFLARE_API_TOKEN` (Pages: Edit), `CLOUDFLARE_ACCOUNT_ID`.
To run an update now: `gh workflow run update.yml`.

### The Raspberry Pi fetch runner

api.data.gov.in refuses connections from GitHub-hosted runners, so the `fetch` job runs on the Pi (`pi@192.168.1.88`) as a GitHub self-hosted runner with the label `pi`, installed in `/home/pi/actions-runner` as a systemd service. If the Pi is off, runs wait for it and that slot's reading is lost; the site keeps showing the last good build.

```sh
# on the Pi
cd ~/actions-runner
sudo ./svc.sh status     # or: start / stop
# from anywhere: is it online?
gh api repos/krishnaghatti/dhuan/actions/runners --jq '.runners[] | "\(.name) \(.status)"'
```
