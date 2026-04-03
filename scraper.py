import requests
from bs4 import BeautifulSoup

url = "https://www.fishipedia.es/pez/betta-splendens"
html = requests.get(url).text

soup = BeautifulSoup(html, "html.parser")

print(soup.text)