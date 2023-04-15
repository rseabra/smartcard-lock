release: src/extension.js
	gnome-extensions pack -f src
	mv 'smartcard-lock@gnome.org.shell-extension.zip' "smartcard-lock@gnome.org.shell-extension-`jq '.version' < src/metadata.json`.zip"

clean: *.zip
	rm -f *.zip
