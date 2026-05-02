#!/usr/bin/env bash
# Download the 32 verified casebook URLs from docs/research/new-pdf-urls.md
# into casebooks/raw/ with deterministic filenames. Skip if file already exists.
set -u
cd "$(dirname "$0")/../.."
DEST="casebooks/raw"
mkdir -p "$DEST"

declare -a URLS=(
  "https://www.srcrc.in/publications/docs/CASEBOOK.pdf|new3-srcrc_casebook_2024.pdf"
  "https://www.caciitg.com/ktc/KTC%202025%20Business%20Casebook.pdf|new3-iitg_ktc_2025.pdf"
  "https://www.caciitg.com/ktc/Final%20Casebook.pdf|new3-iitg_ktc_final.pdf"
  "https://caciitg.com/wc/course/assets/files/Consulting%20Tools.pdf|new3-iitg_consulting_tools.pdf"
  "https://s3.amazonaws.com/kajabi-storefronts-production/file-uploads/sites/2148113698/themes/2155865139/downloads/a0efa23-0a8f-0110-4e15-0df048e42f4_MasterTheCase-Case-Interview-Casebooks-IIM-Calcutta-2022.pdf|new3-iimc_2021_22.pdf"
  "https://inside.rotman.utoronto.ca/mca/files/2013/08/Fuqua-2009.pdf|new3-fuqua_2009.pdf"
  "https://careerinconsulting.com/wp-content/uploads/2019/12/11.-Fuqua-Case-book-2017.pdf|new3-fuqua_2017.pdf"
  "https://s3.amazonaws.com/kajabi-storefronts-production/file-uploads/sites/2148113698/themes/2155865139/downloads/2f153fa-2abd-fbb-4cba-cc52e8cda5_MasterTheCase-Case-Interview-Casebooks-Duke-2022.pdf|new3-duke_2022.pdf"
  "https://careerinconsulting.com/wp-content/uploads/2019/12/10.-Darden-Case-Book-2018-2019.pdf|new3-darden_2018_19.pdf"
  "https://s3.amazonaws.com/kajabi-storefronts-production/file-uploads/sites/2148113698/themes/2155865139/downloads/870c3a-4cb-6f0e-1ab-dabf5d73bb6_MasterTheCase-Case-Interview-Casebooks-Darden-2021.pdf|new3-darden_2020_21.pdf"
  "https://www.wallstreetoasis.com/files/wharton_2009.pdf|new3-wharton_2009_wso.pdf"
  "https://wp.stolaf.edu/pipercenter/files/2015/06/wharton-2008a.pdf|new3-wharton_2008.pdf"
  "https://www.wallstreetoasis.com/files/wharton_2007.pdf|new3-wharton_2007.pdf"
  "https://careerinconsulting.com/wp-content/uploads/2019/12/9.-Stern-MCA-Casebook-2019.pdf|new3-stern_2019.pdf"
  "https://s3.amazonaws.com/kajabi-storefronts-production/file-uploads/sites/2148113698/themes/2155865139/downloads/37f8b56-05a7-ab0-18f4-086325f342f_MasterTheCase-Case-Interview-Casebooks-Stern-2017.pdf|new3-stern_2017.pdf"
  "https://s3.amazonaws.com/kajabi-storefronts-production/file-uploads/sites/2148113698/themes/2155865139/downloads/b66af61-cec2-1ed-bd-2fc87e12747_MasterTheCase-Case-Interview-Casebooks-Stern-2021.pdf|new3-stern_2021.pdf"
  "https://careerinconsulting.com/wp-content/uploads/2019/12/3.-Columbia-case-book-2006.pdf|new3-columbia_2006.pdf"
  "https://assets.managementconsulted.com/app/uploads/2019/06/01075326/Columbia-Business-School-MBA-Casebook.pdf|new3-columbia_mc_alt.pdf"
  "https://careerinconsulting.com/wp-content/uploads/2019/12/1.-Chicago-case-book-2004.pdf|new3-chicago_2004.pdf"
  "https://s3.amazonaws.com/kajabi-storefronts-production/file-uploads/sites/2148113698/themes/2155865139/downloads/fde8-7de4-2a78-e48c-8abc6ec3f5c3_MasterTheCase-Case-Interview-Casebooks-Chicago-2009.pdf|new3-chicago_2009.pdf"
  "https://careerinconsulting.com/wp-content/uploads/2019/12/8.-MIT-Sloan-Case-Book-2015.pdf|new3-mit_sloan_2015.pdf"
  "https://s3.amazonaws.com/kajabi-storefronts-production/file-uploads/sites/2148113698/themes/2155865139/downloads/f06a5e7-bbda-1c2-ba4d-ffd6b8ee0f8_MasterTheCase-Case-Interview-Casebooks-Kellogg-2011.pdf|new3-kellogg_2011.pdf"
  "https://s3.amazonaws.com/kajabi-storefronts-production/file-uploads/sites/2148113698/themes/2155865139/downloads/bfc8521-25e1-1556-c3b3-412ab4a7f1ee_MasterTheCase-Case-Interview-Casebooks-INSEAD-2021.pdf|new3-insead_2021.pdf"
  "https://s3.amazonaws.com/kajabi-storefronts-production/file-uploads/sites/2148113698/themes/2155865139/downloads/f34685e-7b1-2c05-ca6d-74646b5da366_MasterTheCase-Case-Interview-Casebooks-Ross-2008.pdf|new3-ross_2008.pdf"
  "https://www.utscmcg.com/static/media/Rotman%20Case%20Book.2da4ced284a502a7b558.pdf|new3-rotman.pdf"
  "https://managementconsulted.com/app/uploads/2019/06/UC-Berkeley-Haas-School-of-Business-MBA-Casebook.pdf|new3-haas.pdf"
  "https://www.myconsultingcoach.com/files/news/casebook/Goizueta%20Business%20School%20Consulting%20Casebook.pdf|new3-goizueta.pdf"
  "https://careerinconsulting.com/wp-content/uploads/2019/12/2.-AGSM-case-book-2002.pdf|new3-agsm_2002.pdf"
  "https://bpb-us-w2.wpmucdn.com/voices.uchicago.edu/dist/8/3622/files/2025/09/400-IB-Questions-Interview-Guide.pdf|new3-wso_400_ib_questions.pdf"
  "https://cdn.vanderbilt.edu/vu-URL/wp-content/uploads/sites/269/2020/08/19222742/Investment-Banking-Guide-Final.pdf|new3-vanderbilt_ib_guide.pdf"
  "https://wsp-pdf-ebook.s3.amazonaws.com/WSP_RedBook_Sample.pdf|new3-wsp_red_book.pdf"
)

ok=0
skip=0
fail=0
for entry in "${URLS[@]}"; do
  url="${entry%%|*}"
  fname="${entry##*|}"
  out="$DEST/$fname"
  if [ -f "$out" ] && [ -s "$out" ]; then
    echo "skip (exists): $fname"
    skip=$((skip+1)); continue
  fi
  if curl -sL --max-time 60 -A "Mozilla/5.0" -o "$out" "$url"; then
    if [ -s "$out" ]; then
      sz=$(stat -c %s "$out")
      echo "+ $fname ($((sz/1024))kb)"
      ok=$((ok+1))
    else
      rm -f "$out"
      echo "fail (empty): $fname"
      fail=$((fail+1))
    fi
  else
    echo "fail (curl): $fname"
    fail=$((fail+1))
  fi
done
echo
echo "Done. ok=$ok skip=$skip fail=$fail"
