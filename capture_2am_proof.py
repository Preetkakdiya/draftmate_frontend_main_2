import time
import datetime
import subprocess
import json
import os

def main():
    target_hour = 2
    target_minute = 5
    
    now = datetime.datetime.now()
    target_time = now.replace(hour=target_hour, minute=target_minute, second=0, microsecond=0)
    
    if now >= target_time:
        target_time += datetime.timedelta(days=1)
        
    sleep_seconds = (target_time - now).total_seconds()
    print(f"[INFO] Current time: {now.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"[INFO] Target proof capture time: {target_time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"[WAIT] Sleeping for {sleep_seconds:.1f} seconds ({sleep_seconds/3600:.2f} hours)...")
    
    time.sleep(sleep_seconds)
    
    print("\n[START] Capturing AWS App Runner status proof at 2:05 AM IST...")
    
    arn = "arn:aws:apprunner:us-east-1:423360724337:service/draftmate-app/684f55e28fc24e0e9d837cd9d175e5a9"
    cmd = ["aws", "apprunner", "describe-service", "--service-arn", arn, "--region", "us-east-1"]
    
    res = subprocess.run(cmd, capture_output=True, text=True)
    
    proof_data = {
        "timestamp_ist": datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S IST'),
        "raw_output": res.stdout,
        "raw_error": res.stderr
    }
    
    try:
        service_info = json.loads(res.stdout).get("Service", {})
        status = service_info.get("Status")
        updated_at = service_info.get("UpdatedAt")
        proof_data["status"] = status
        proof_data["updated_at"] = updated_at
    except Exception as e:
        proof_data["status"] = f"Error parsing: {e}"
        
    with open("NIGHTLY_2AM_PROOF.json", "w", encoding="utf-8") as f:
        json.dump(proof_data, f, indent=4)
        
    md_content = f"""# 🌙 2:05 AM IST Nightly Shutdown Proof Report

* **Capture Time:** `{proof_data.get('timestamp_ist')}`
* **Service Name:** `draftmate-app`
* **AWS App Runner Status:** **`{proof_data.get('status')}`**
* **Last Updated At:** `{proof_data.get('updated_at')}`

---

## AWS CLI Raw Verification Output
```json
{proof_data.get('raw_output')}
```
"""
    with open("NIGHTLY_2AM_PROOF.md", "w", encoding="utf-8") as f:
        f.write(md_content)
        
    print("[SUCCESS] Proof report successfully written to NIGHTLY_2AM_PROOF.md!")

if __name__ == "__main__":
    main()
