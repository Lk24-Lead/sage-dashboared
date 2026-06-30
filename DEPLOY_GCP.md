# Deploy SAGE Dashboard — Google Cloud Free VM

## What you get
- **Free forever** — GCP e2-micro in `us-central1` is in the Always Free tier
- **Always on** — PM2 keeps the server running 24/7, auto-restarts after crashes or VM reboots
- **No credit card charges** — stays within free tier as long as you stay in `us-central1`

---

## Step 1 — Create a Google Cloud account

1. Go to https://cloud.google.com and sign up (requires a Google account)
2. You'll need to enter a credit card for identity verification — **you won't be charged** as long as you stay in the free tier

---

## Step 2 — Create the free VM

1. Go to **Compute Engine → VM Instances → Create Instance**
2. Set these values:
   - **Name**: `sage-dashboard`
   - **Region**: `us-central1` (Iowa) — IMPORTANT: only this region is free
   - **Zone**: `us-central1-a`
   - **Machine type**: `e2-micro` (0.25 vCPU, 1 GB RAM)
   - **Boot disk**: Ubuntu 22.04 LTS, 30 GB
   - **Firewall**: ✅ Allow HTTP traffic, ✅ Allow HTTPS traffic
3. Click **Create** and wait ~1 minute

---

## Step 3 — Open port 8000 (firewall rule)

1. Go to **VPC Network → Firewall → Create Firewall Rule**
2. Set:
   - **Name**: `allow-8000`
   - **Direction**: Ingress
   - **Targets**: All instances in the network
   - **Source IP ranges**: `0.0.0.0/0`
   - **Protocols and ports**: TCP, port `8000`
3. Click **Create**

---

## Step 4 — SSH into the VM

In the VM list, click the **SSH** button next to your VM. A browser terminal opens.

---

## Step 5 — Upload and run the setup script

In the SSH terminal, run these commands:

```bash
# Create app folder
mkdir -p /home/sage_app && cd /home/sage_app

# Copy your app files here — easiest way: use GCP Cloud Shell upload
# OR use git if your repo is on GitHub:
# git clone https://github.com/your-org/food-sage.git .
# cd india_next_app
```

**Easiest file transfer — use GCP's built-in upload:**
1. In the SSH window, click the gear icon → **Upload files**
2. Upload the entire `india_next_app` folder contents
3. Then run:

```bash
cd /home/sage_app
bash setup_vm.sh
```

The script will:
- Install Python + Node.js + PM2
- Build the React frontend
- Ask you for your Databricks token (paste it, it won't show)
- Start the server automatically

---

## Step 6 — Get your public URL

```bash
curl ifconfig.me
```

Share `http://<YOUR_IP>:8000` with your team. Done!

---

## Step 7 — Optional: point a domain at it

If you have a domain, add an A record pointing to your VM's IP.
GCP static IP: Compute Engine → VM → Edit → External IP → change to "Static" (free for 1 IP on a running VM).

---

## Useful commands (run in SSH)

```bash
pm2 status                    # is the app running?
pm2 logs sage-dashboard       # live logs (Ctrl+C to exit)
pm2 restart sage-dashboard    # restart after changes
pm2 stop sage-dashboard       # stop

# Update the app after code changes:
cd /home/sage_app
git pull                      # if using git
cd webapp && npm run build && cd ..
pm2 restart sage-dashboard
```

---

## Cost check

Free tier covers:
- 1 e2-micro VM in us-central1 — **free**
- 30 GB standard persistent disk — **free**
- 1 GB egress/month — **free**

Your team members viewing the dashboard count as egress. Typical usage (10 people, multiple refreshes/day) will be well under 1 GB/month.
