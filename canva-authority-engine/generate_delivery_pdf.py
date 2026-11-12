#!/usr/bin/env python3
"""Generate Authority Engine client delivery PDF."""

from pathlib import Path

from reportlab.lib.colors import Color, white
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

OUT = Path("/opt/cursor/artifacts/Authority-Engine-Livraison-Client.pdf")
OUT_REPO = Path(
    "/agent/repos/Awesome-Hacking-Resources/canva-authority-engine/"
    "Authority-Engine-Livraison-Client.pdf"
)

# Palette: charcoal + sand + deep teal (premium, not generic purple)
CHARCOAL = Color(0.12, 0.14, 0.16)
INK = Color(0.18, 0.20, 0.22)
SAND = Color(0.96, 0.94, 0.90)
TEAL = Color(0.10, 0.37, 0.40)
TEAL_SOFT = Color(0.82, 0.90, 0.90)
MUTED = Color(0.42, 0.45, 0.48)
LINE = Color(0.78, 0.76, 0.72)

W, H = A4
MARGIN = 18 * mm


def draw_bg(c: canvas.Canvas, color=SAND):
    c.setFillColor(color)
    c.rect(0, 0, W, H, fill=1, stroke=0)


def draw_footer(c: canvas.Canvas, page: int, total: int = 4):
    c.setStrokeColor(LINE)
    c.setLineWidth(0.5)
    c.line(MARGIN, 14 * mm, W - MARGIN, 14 * mm)
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 8)
    c.drawString(MARGIN, 9 * mm, "Authority Engine  ·  Studio Aura Templates")
    c.drawRightString(W - MARGIN, 9 * mm, f"{page} / {total}")


def page_cover(c: canvas.Canvas):
    draw_bg(c, CHARCOAL)

    # Teal accent bar
    c.setFillColor(TEAL)
    c.rect(0, H - 8 * mm, W, 8 * mm, fill=1, stroke=0)
    c.rect(0, 0, W, 8 * mm, fill=1, stroke=0)

    c.setFillColor(TEAL_SOFT)
    c.setFont("Helvetica", 10)
    c.drawCentredString(W / 2, H - 32 * mm, "LIVRAISON DIGITALE  ·  ACCÈS IMMÉDIAT")

    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 32)
    c.drawCentredString(W / 2, H - 55 * mm, "AUTHORITY ENGINE")

    c.setFont("Helvetica", 13)
    c.setFillColor(TEAL_SOFT)
    c.drawCentredString(
        W / 2,
        H - 68 * mm,
        "Bundle Canva pour coachs & personal brands",
    )

    # Card
    card_y = 55 * mm
    c.setFillColor(SAND)
    c.roundRect(MARGIN, card_y, W - 2 * MARGIN, 95 * mm, 6, fill=1, stroke=0)

    c.setFillColor(TEAL)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(MARGIN + 10 * mm, card_y + 80 * mm, "INCLUS DANS TON TÉLÉCHARGEMENT")

    items = [
        "Aura Social Starter — 30 posts + 20 stories + 8 highlights",
        "Aura Carousel Authority — 12 carrousels éducatifs",
        "Aura Lead Magnet Kit — ebook 18 pages + checklist + mockups",
        "Licence commerciale pour TA marque",
        "Guide d’utilisation + support email",
    ]
    c.setFillColor(INK)
    c.setFont("Helvetica", 10)
    y = card_y + 65 * mm
    for item in items:
        c.setFillColor(TEAL)
        c.circle(MARGIN + 12 * mm, y + 1.5 * mm, 1.6 * mm, fill=1, stroke=0)
        c.setFillColor(INK)
        c.drawString(MARGIN + 18 * mm, y, item)
        y -= 9 * mm

    c.setFillColor(MUTED)
    c.setFont("Helvetica", 9)
    c.drawCentredString(W / 2, 38 * mm, "Produit digital  ·  Aucun envoi physique")
    c.setFillColor(TEAL_SOFT)
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(W / 2, 28 * mm, "Studio Aura Templates")
    c.showPage()


def section_title(c: canvas.Canvas, title: str, y: float) -> float:
    c.setFillColor(TEAL)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(MARGIN, y, title)
    c.setStrokeColor(LINE)
    c.setLineWidth(0.8)
    c.line(MARGIN, y - 3 * mm, W - MARGIN, y - 3 * mm)
    return y - 12 * mm


def body(c: canvas.Canvas, text: str, y: float, size=10, color=INK, leading=5.2 * mm) -> float:
    c.setFillColor(color)
    c.setFont("Helvetica", size)
    c.drawString(MARGIN, y, text)
    return y - leading


def link_box(c: canvas.Canvas, label: str, placeholder: str, y: float) -> float:
    c.setFillColor(white)
    c.setStrokeColor(LINE)
    c.setLineWidth(1)
    c.roundRect(MARGIN, y - 16 * mm, W - 2 * MARGIN, 20 * mm, 4, fill=1, stroke=1)
    c.setFillColor(TEAL)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(MARGIN + 5 * mm, y - 2 * mm, label)
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 8)
    c.drawString(MARGIN + 5 * mm, y - 8 * mm, "Lien Canva (à remplacer) :")
    c.setFillColor(INK)
    c.setFont("Helvetica", 9)
    c.drawString(MARGIN + 5 * mm, y - 13 * mm, placeholder)
    return y - 26 * mm


def page_links(c: canvas.Canvas):
    draw_bg(c, SAND)
    y = H - 28 * mm
    y = section_title(c, "1. Tes liens Canva", y)
    y = body(
        c,
        "Clique chaque lien → “Use template” / “Utiliser le modèle” → renomme ta copie.",
        y,
        size=9,
        color=MUTED,
    )
    y -= 2 * mm
    y = link_box(
        c,
        "AURA SOCIAL STARTER",
        "https://www.canva.com/design/XXXX_SOCIAL/view?utm_content=XXXX&utm_campaign=designshare",
        y,
    )
    y = link_box(
        c,
        "AURA CAROUSEL AUTHORITY",
        "https://www.canva.com/design/XXXX_CAROUSEL/view?utm_content=XXXX&utm_campaign=designshare",
        y,
    )
    y = link_box(
        c,
        "AURA LEAD MAGNET KIT",
        "https://www.canva.com/design/XXXX_LEADMAGNET/view?utm_content=XXXX&utm_campaign=designshare",
        y,
    )

    y = section_title(c, "2. Installation en 4 étapes", y)
    steps = [
        "Ouvre le lien avec un compte Canva gratuit ou Pro.",
        "Clique “Utiliser le modèle” pour créer ta copie éditable.",
        "Remplace couleurs, polices, photos et textes par ta marque.",
        "Exporte en PNG/PDF et publie — ou partage ton freebie.",
    ]
    for i, step in enumerate(steps, 1):
        c.setFillColor(TEAL)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(MARGIN, y, f"{i}.")
        c.setFillColor(INK)
        c.setFont("Helvetica", 10)
        c.drawString(MARGIN + 8 * mm, y, step)
        y -= 7 * mm

    y -= 4 * mm
    y = section_title(c, "3. Contenu livré (rappel)", y)
    rows = [
        ("Social Starter", "30 posts · 20 stories · 8 covers highlights · brand board"),
        ("Carousel Authority", "12 carrousels (hooks + slides + CTA) prêts à customiser"),
        ("Lead Magnet Kit", "Ebook workbook 18 pages · checklist · mockups opt-in"),
    ]
    for name, desc in rows:
        c.setFillColor(TEAL)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(MARGIN, y, name)
        c.setFillColor(INK)
        c.setFont("Helvetica", 9)
        c.drawString(MARGIN + 42 * mm, y, desc)
        y -= 7 * mm

    draw_footer(c, 2)
    c.showPage()


def page_license_support(c: canvas.Canvas):
    draw_bg(c, SAND)
    y = H - 28 * mm
    y = section_title(c, "4. Licence d’utilisation", y)

    c.setFillColor(TEAL)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(MARGIN, y, "TU PEUX")
    y -= 7 * mm
    allowed = [
        "Utiliser les templates pour ta marque personnelle ou ton business.",
        "Modifier textes, couleurs, images et layouts sans limite.",
        "Publier les créations finales sur tes réseaux, site, email, pubs.",
        "Utiliser commercialement pour promouvoir TES offres et services.",
    ]
    c.setFont("Helvetica", 9)
    for line in allowed:
        c.setFillColor(TEAL)
        c.drawString(MARGIN, y, "✓")
        c.setFillColor(INK)
        c.drawString(MARGIN + 6 * mm, y, line)
        y -= 6 * mm

    y -= 3 * mm
    c.setFillColor(Color(0.55, 0.18, 0.16))
    c.setFont("Helvetica-Bold", 10)
    c.drawString(MARGIN, y, "TU NE PEUX PAS")
    y -= 7 * mm
    forbidden = [
        "Revendre, redistribuer ou partager les fichiers Canva / PDF d’origine.",
        "Inclure les templates “tels quels” dans un autre pack payant ou gratuit.",
        "Transférer l’accès à un tiers (assistant ok si interne à TA marque).",
        "Déposer les designs comme tiens auprès d’un marketplace de templates.",
    ]
    for line in forbidden:
        c.setFillColor(Color(0.55, 0.18, 0.16))
        c.setFont("Helvetica", 9)
        c.drawString(MARGIN, y, "✗")
        c.setFillColor(INK)
        c.drawString(MARGIN + 6 * mm, y, line)
        y -= 6 * mm

    y -= 6 * mm
    y = section_title(c, "5. Support", y)
    y = body(c, "Un lien ne s’ouvre pas ? Besoin d’aide pour dupliquer le modèle ?", y)
    y = body(c, "Écris-nous avec ton numéro de commande :", y, color=MUTED, size=9)
    y = body(c, "support@studio-aura-templates.com", y, size=11, color=TEAL)
    y = body(
        c,
        "Délai de réponse habituel : 24–48 h (jours ouvrés).",
        y,
        size=9,
        color=MUTED,
    )

    y -= 4 * mm
    y = section_title(c, "6. Prérequis techniques", y)
    for line in [
        "Compte Canva gratuit ou Canva Pro (recommandé pour Brand Kit).",
        "Navigateur à jour — les liens “view” Canva doivent être en mode partage template.",
        "Connexion internet pour dupliquer et éditer.",
    ]:
        y = body(c, f"•  {line}", y, size=9)

    y -= 4 * mm
    c.setFillColor(TEAL_SOFT)
    c.roundRect(MARGIN, y - 28 * mm, W - 2 * MARGIN, 30 * mm, 4, fill=1, stroke=0)
    c.setFillColor(TEAL)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(MARGIN + 5 * mm, y - 6 * mm, "POLITIQUE DIGITALE")
    c.setFillColor(INK)
    c.setFont("Helvetica", 8)
    c.drawString(
        MARGIN + 5 * mm,
        y - 13 * mm,
        "Produit numérique à téléchargement immédiat — aucun article physique.",
    )
    c.drawString(
        MARGIN + 5 * mm,
        y - 19 * mm,
        "En raison de la nature du produit, les remboursements ne sont pas disponibles",
    )
    c.drawString(
        MARGIN + 5 * mm,
        y - 24 * mm,
        "une fois les liens Canva livrés. Support technique inclus.",
    )

    draw_footer(c, 3)
    c.showPage()


def page_upsell(c: canvas.Canvas):
    draw_bg(c, SAND)
    y = H - 28 * mm
    y = section_title(c, "7. Passe au niveau suivant", y)
    y = body(
        c,
        "Tu as le système de contenu. Prochaine étape : workbook client,",
        y,
    )
    y = body(c, "media kit & pitch deck pour vendre plus cher, plus clairement.", y)
    y -= 4 * mm

    # Upsell card
    c.setFillColor(CHARCOAL)
    c.roundRect(MARGIN, y - 72 * mm, W - 2 * MARGIN, 74 * mm, 6, fill=1, stroke=0)
    c.setFillColor(TEAL)
    c.rect(MARGIN, y - 72 * mm, 3 * mm, 74 * mm, fill=1, stroke=0)

    c.setFillColor(TEAL_SOFT)
    c.setFont("Helvetica", 9)
    c.drawString(MARGIN + 10 * mm, y - 10 * mm, "UPSELL CLIENT  ·  CODE PRIVÉ")

    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(MARGIN + 10 * mm, y - 22 * mm, "Coach Business OS")

    c.setFillColor(TEAL_SOFT)
    c.setFont("Helvetica", 9)
    lines = [
        "Workbook coaching · Media Kit Pro · Pitch & Offer Deck · Content Planner",
        "Prix public : 79 €",
        "Ton prix exclusif acheteur Authority Engine : 59 €",
    ]
    yy = y - 34 * mm
    for line in lines:
        c.drawString(MARGIN + 10 * mm, yy, line)
        yy -= 6 * mm

    c.setFillColor(TEAL)
    c.roundRect(MARGIN + 10 * mm, y - 64 * mm, 55 * mm, 10 * mm, 3, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 11)
    c.drawCentredString(MARGIN + 37.5 * mm, y - 60.5 * mm, "UPGRADE25")

    c.setFillColor(MUTED)
    c.setFont("Helvetica", 8)
    c.drawString(MARGIN + 70 * mm, y - 59 * mm, "Code valable 14 jours après achat")

    y = y - 86 * mm
    y = section_title(c, "8. Checklist de démarrage (Jour 1)", y)
    checks = [
        "Dupliquer les 3 fichiers Canva dans ton compte",
        "Appliquer tes 3–4 couleurs + 2 polices (Brand Kit)",
        "Remplacer @toncompte et le CTA unique",
        "Planifier 7 posts + 1 carrousel cette semaine",
        "Personnaliser la cover du lead magnet + page opt-in",
        "Ajouter le freebie dans tes Highlights (FREEBIE / START)",
    ]
    for check in checks:
        c.setStrokeColor(TEAL)
        c.setLineWidth(1)
        c.rect(MARGIN, y - 0.5 * mm, 3.5 * mm, 3.5 * mm, fill=0, stroke=1)
        c.setFillColor(INK)
        c.setFont("Helvetica", 9)
        c.drawString(MARGIN + 7 * mm, y, check)
        y -= 7.5 * mm

    y -= 6 * mm
    c.setFillColor(TEAL_SOFT)
    c.roundRect(MARGIN, 22 * mm, W - 2 * MARGIN, 28 * mm, 4, fill=1, stroke=0)
    c.setFillColor(TEAL)
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(W / 2, 40 * mm, "Merci pour ton achat.")
    c.setFillColor(INK)
    c.setFont("Helvetica", 9)
    c.drawCentredString(
        W / 2,
        32 * mm,
        "Publie avec clarté. Vends avec une direction. Construis ton autorité.",
    )
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 8)
    c.drawCentredString(W / 2, 25 * mm, "© Studio Aura Templates — Tous droits réservés")

    draw_footer(c, 4)
    c.showPage()


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT_REPO.parent.mkdir(parents=True, exist_ok=True)

    c = canvas.Canvas(str(OUT), pagesize=A4)
    c.setTitle("Authority Engine — Livraison Client")
    c.setAuthor("Studio Aura Templates")
    c.setSubject("PDF de livraison — liens Canva, licence, support, upsell")

    page_cover(c)
    page_links(c)
    page_license_support(c)
    page_upsell(c)
    c.save()

    OUT_REPO.write_bytes(OUT.read_bytes())
    print(f"OK: {OUT}")
    print(f"OK: {OUT_REPO}")
    print(f"Size: {OUT.stat().st_size} bytes")


if __name__ == "__main__":
    main()
