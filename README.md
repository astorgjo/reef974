# Reef974

Photos sous-marines et road trips à La Réunion 🐠 : une carte interactive façon jeu vidéo avec les spots photo, les spots van, les bivouacs et les randos.

## Comment c'est organisé

| Fichier | Rôle |
|---|---|
| `index.html` | La page, avec la carte de l'île (SVG) |
| `css/style.css` | Le style (couleurs dans `:root`) |
| `js/map-style.js` | Le style de carte maison (couleurs, relief, typo) |
| `js/app.js` | Repères, filtres, fiches, missions, galerie photo |
| `placer.html` | Outil pour placer précisément les spots et les photos |
| `data/spots.json` | Les spots (nom, type, coordonnées GPS, texte, photos) |
| `data/missions.json` | Les road trips (liste d'identifiants de spots) |
| `data/site.json` | Instagram + infos du van Don Pablo |
| `images/` | Les photos envoyées depuis l'admin |
| `.pages.yml` | La config de l'admin Pages CMS |

## Ajouter une photo ou un spot

Va sur https://app.pagescms.org, connecte-toi avec GitHub et ouvre le repo `reef974`.
Dans **Spots de la carte**, ajoute un spot (latitude/longitude) ou une photo à un spot existant, puis enregistre. Le site se met à jour tout seul.

## Tester en local

```
python3 -m http.server 8000
```
puis ouvrir http://localhost:8000 (les données sont chargées en `fetch`, donc il faut un petit serveur).
