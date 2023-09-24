#!/usr/bin/env bash
# Script to fetch all the types of futures contracts from the CFTC.
# Saves JSON arrays to files in `public/available-contracts/`.

disaggregated_url="https://publicreporting.cftc.gov/resource/72hh-3qpy.json"
financial_futures_url="https://publicreporting.cftc.gov/resource/gpe5-46if.json"
legacy_url="https://publicreporting.cftc.gov/resource/6dca-aqww.json"
file_output_dir="$(git rev-parse --show-toplevel)/public/available-contracts"

mkdir -p "$file_output_dir"

function generate_older_timestamp {
    local python3_code=$(cat <<EOF
import datetime

d = datetime.datetime.now() - datetime.timedelta(days=90)
iso_timestamp = d.strftime("%Y-%m-%dT%H:%M:%S")
print(iso_timestamp)
EOF
)
    python3 -c "$python3_code"
}

function fetch_oldest_dates {
    local url="$1"
    if [ -z "$url" ]; then
        return 1
    fi
    
    curl -X GET "$url" -G \
    --data-urlencode "\$select=cftc_contract_market_code,min(report_date_as_yyyy_mm_dd) as oldest_report_date" \
    --data-urlencode "\$group=cftc_contract_market_code" \
    --data-urlencode "\$limit=10000" \
    --compressed \
    -o -
}

function fetch_available_contracts {
    local url="$1"
    local output_filename="$2"
    if [ -z "$url" ]; then
        return 1
    fi 
    if [ -z "output_filename" ]; then
        return 1
    fi

    local threshold_date_timestamp=$(generate_older_timestamp)

    curl -X GET "$url" -G  \
        --data-urlencode "\$select=cftc_contract_market_code,trim(cftc_commodity_code) as cftc_commodity_code,market_and_exchange_names,contract_market_name,commodity_name,cftc_market_code,cftc_region_code,commodity,commodity_subgroup_name,commodity_group_name,min(report_date_as_yyyy_mm_dd) as oldest_report_date" \
        --data-urlencode "\$group=cftc_contract_market_code,cftc_commodity_code,market_and_exchange_names,contract_market_name,commodity_name,cftc_market_code,cftc_region_code,commodity,commodity_subgroup_name,commodity_group_name" \
        --data-urlencode "\$having=max(report_date_as_yyyy_mm_dd) > '${threshold_date_timestamp}'" \
        --data-urlencode "\$limit=10000" \
        --compressed \
        --output "$output_filename";
    
    if [ $? -ne 0 ]; then
        return $?
    fi

    # Process JSON
    if command -v jq >/dev/null 2>&1; then
        temp_file=$(mktemp)
        jq . "$output_filename" > "$temp_file"
        mv "$temp_file" "$output_filename"

        # Fetch oldest dates separately and merge them in with `jq` magic
        oldest_dates_json=$(fetch_oldest_dates "$url")
        output_with_oldest_dates=$(mktemp)
        cftc_code_map_to_date=$(jq -r 'map({(.cftc_contract_market_code): .oldest_report_date}) | add' <<< "$oldest_dates_json")
        jq --argjson cftc_code_map_to_date "$cftc_code_map_to_date" \
            '.[] | .oldest_report_date = $cftc_code_map_to_date[.cftc_contract_market_code] // .oldest_report_date' \
            "$output_filename" > "$output_with_oldest_dates"
        mv "$output_with_oldest_dates" "$output_filename"
    fi
}

fetch_available_contracts ${legacy_url} "${file_output_dir}/legacy.json" 
fetch_available_contracts ${financial_futures_url} "${file_output_dir}/financial-futures.json" 
fetch_available_contracts ${disaggregated_url} "${file_output_dir}/disaggregated.json" 