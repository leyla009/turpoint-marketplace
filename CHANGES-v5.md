# TurPoint fixes v5 (on top of v4)

1. backend/src/db/index.js - on boot, tours saved as 'Gəbələ' are renamed to 'Qəbələ' (idempotent, runs once in effect).
2. backend/src/db/seed.js  - the seed no longer creates the duplicate 'Gəbələ' location ('Qax' replaces it).
3. backend/.gitignore      - adds `uploads/` so operator photos are never committed.

Manual git steps (cannot be done from a zip):
  git rm --cached frontend/tsconfig.tsbuildinfo          # already tracked, but listed in .gitignore
  git rm -r --cached backend/uploads                      # only if it was committed
  git rm --cached backend/turpoint.db* 2>/dev/null        # only if any database file was committed
