#!/bin/sh
# Bundles the whole game into one self-contained HTML file.
# Usage:  sh build-single.sh   ->  writes focus-village-single.html
awk '
  /<link rel="stylesheet"/ {
    print "<style>";
    while ((getline line < "css/style.css") > 0) print line;
    close("css/style.css");
    print "</style>";
    next
  }
  /<script src="/ {
    match($0, /src="[^"]+"/);
    f = substr($0, RSTART+5, RLENGTH-6);
    print "<script>";
    while ((getline line < f) > 0) print line;
    close(f);
    print "</" "script>";
    next
  }
  { print }
' index.html > focus-village-single.html
echo "built focus-village-single.html"
