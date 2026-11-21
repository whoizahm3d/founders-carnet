# Scraping and source policy

The configured corpus-source domain whitelist is:

```json
{
  "SECP": ["www.secp.gov.pk"],
  "FBR": ["download1.fbr.gov.pk", "www.fbr.gov.pk", "e.fbr.gov.pk"],
  "PSEB": ["techdestination.com"]
}
```

This is the contents of `backend/app/config/scrape_whitelist.json`. The whitelist names official SECP and FBR corpus hosts and the PSEB industry facilitation page host.

Market research uses public web search with a personal-profile domain blocklist; it does not scrape individual profiles. Portfolio checks read only the URL the user submitted. Compliance retrieval remains limited to the approved corpus and does not use market-search results.
