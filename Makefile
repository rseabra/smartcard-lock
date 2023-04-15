release: src/extension.js
	gnome-extensions pack -f src
	mv "`jq -r '.uuid' < src/metadata.json`.shell-extension.zip" "`jq -r '.uuid' < src/metadata.json`.shell-extension-`jq '.version' < src/metadata.json`.zip"

clean: *.zip
	rm -f *.zip
