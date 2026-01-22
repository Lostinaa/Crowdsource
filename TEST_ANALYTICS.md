# Testing Backend Analytics Enhancements

## Prerequisites

1. **Start PostgreSQL Database:**
   ```bash
   cd ~/code/rn/backend
   docker-compose up -d postgres
   # OR if using local postgres:
   sudo systemctl start postgresql
   ```

2. **Start Laravel Server:**
   ```bash
   cd ~/code/rn/backend
   php artisan serve --host=0.0.0.0 --port=8000
   ```

## Test Endpoints

### 1. Test Voice Analytics
```bash
curl http://localhost:8000/api/analytics/voice | jq
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "total_attempts": 100,
    "total_completed": 95,
    "total_dropped": 5,
    "total_setup_ok": 98,
    "average_setup_time": 2500,
    "average_mos": 4.2,
    "cssr": 98.0,
    "cdr": 5.0,
    "mos_under_1_6_percentage": 2.5,
    "setup_time_over_10s_percentage": 1.0
  }
}
```

**New Fields to Verify:**
- ✅ `mos_under_1_6_percentage` - Should be a percentage (0-100)
- ✅ `setup_time_over_10s_percentage` - Should be a percentage (0-100)
- ✅ `cssr` and `cdr` - Now returned as percentages (0-100)

### 2. Test Data Analytics
```bash
curl http://localhost:8000/api/analytics/data | jq
```

**Expected Response Structure:**
```json
{
  "success": true,
  "data": {
    "browsing": {
      "total_requests": 50,
      "total_completed": 48,
      "success_ratio": 96.0,  // NEW
      "average_duration": 1200
    },
    "streaming": {
      "total_requests": 30,
      "total_completed": 28,
      "success_ratio": 93.3,  // NEW
      "average_mos": 4.1,
      "average_setup_time": 3500,  // NEW
      "mos_under_3_8_percentage": 5.0,  // NEW
      "setup_time_over_5s_percentage": 10.0  // NEW
    },
    "http": {
      "download": {
        "total_requests": 20,
        "total_completed": 19,
        "success_ratio": 95.0,  // NEW
        "average_throughput": 15.5,
        "percentile_10th": 8.2,  // NEW
        "percentile_90th": 25.3  // NEW
      },
      "upload": {
        "total_requests": 20,
        "total_completed": 18,
        "success_ratio": 90.0,  // NEW
        "average_throughput": 12.3,
        "percentile_10th": 6.5,  // NEW
        "percentile_90th": 20.1  // NEW
      }
    },
    "ftp": {  // NEW SECTION
      "download": {
        "total_requests": 15,
        "total_completed": 14,
        "success_ratio": 93.3,
        "average_throughput": 18.2,
        "percentile_10th": 10.5,
        "percentile_90th": 28.7
      },
      "upload": {
        "total_requests": 15,
        "total_completed": 13,
        "success_ratio": 86.7,
        "average_throughput": 14.8,
        "percentile_10th": 8.3,
        "percentile_90th": 22.1
      }
    },
    "social": {
      "total_requests": 25,
      "total_completed": 24,
      "success_ratio": 96.0,  // NEW
      "average_duration": 2800,  // NEW
      "duration_over_5s_percentage": 8.0  // NEW
    },
    "latency": {
      "total_requests": 40,
      "total_completed": 38,
      "success_ratio": 95.0,  // NEW
      "interactivity_success_ratio": 85.0,  // NEW
      "average_score": 75.5
    }
  }
}
```

## New Features to Test

### ✅ Percentile Calculations
- Check `http.download.percentile_10th` and `percentile_90th`
- Check `http.upload.percentile_10th` and `percentile_90th`
- Check `ftp.download.percentile_10th` and `percentile_90th`
- Check `ftp.upload.percentile_10th` and `percentile_90th`

### ✅ Threshold-Based Metrics
- `voice.mos_under_1_6_percentage` - Should be 0-100
- `voice.setup_time_over_10s_percentage` - Should be 0-100
- `streaming.mos_under_3_8_percentage` - Should be 0-100
- `streaming.setup_time_over_5s_percentage` - Should be 0-100
- `social.duration_over_5s_percentage` - Should be 0-100

### ✅ Success Ratios
- All test types should have `success_ratio` field (0-100)
- `latency.interactivity_success_ratio` - Percentage of scores > 25

### ✅ FTP Analytics
- Complete FTP download/upload analytics section
- Includes throughput, percentiles, success ratios

## Testing with Sample Data

If you have no data, the endpoints will return:
- `null` for calculated fields
- `0` for counts
- Empty arrays for distributions

## Quick Test Script

```bash
#!/bin/bash
echo "Testing Voice Analytics..."
curl -s http://localhost:8000/api/analytics/voice | jq '.data | {cssr, cdr, mos_under_1_6_percentage, setup_time_over_10s_percentage}'

echo -e "\nTesting Data Analytics..."
curl -s http://localhost:8000/api/analytics/data | jq '.data | {
  browsing: .browsing.success_ratio,
  streaming: {success_ratio: .streaming.success_ratio, mos_under_3_8: .streaming.mos_under_3_8_percentage},
  http_dl: {percentile_10th: .http.download.percentile_10th, percentile_90th: .http.download.percentile_90th},
  ftp: .ftp.download.success_ratio,
  social: .social.duration_over_5s_percentage,
  latency: .latency.interactivity_success_ratio
}'
```

## Filament Admin Panel

You can also test via the Filament admin panel:
1. Go to `http://localhost:8000/admin`
2. Navigate to "QoE Metrics"
3. View individual records to see all metrics
4. Check that all new fields are properly displayed
