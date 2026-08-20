import os
from sqlalchemy import create_engine
import urllib.parse

# Original url
url = "postgresql://postgres.azmrfutepbneyaxgmaye:k3?_QdN2cAq%VW.@aws-1-us-west-2.pooler.supabase.com:5432/postgres"

print("Testing original URL...")
try:
    engine = create_engine(url)
    with engine.connect() as conn:
        print("Success original!")
except Exception as e:
    print(f"Error original: {e}")

# URL encoded password
password = urllib.parse.quote_plus("k3?_QdN2cAq%VW.")
url_encoded = f"postgresql://postgres.azmrfutepbneyaxgmaye:{password}@aws-1-us-west-2.pooler.supabase.com:5432/postgres"

print("\nTesting URL encoded password...")
try:
    engine = create_engine(url_encoded)
    with engine.connect() as conn:
        print("Success encoded!")
except Exception as e:
    print(f"Error encoded: {e}")

# Test port 6543
url_6543 = f"postgresql://postgres.azmrfutepbneyaxgmaye:{password}@aws-1-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
print("\nTesting URL encoded password with port 6543...")
try:
    engine = create_engine(url_6543)
    with engine.connect() as conn:
        print("Success 6543!")
except Exception as e:
    print(f"Error 6543: {e}")
