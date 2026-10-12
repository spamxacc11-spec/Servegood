-- Reference data the application expects to exist. No users, restaurants or
-- prices here: those come from real sign-ups, or from the opt-in demo seeder.

INSERT INTO restaurant_categories (name, slug, kind, sort_order) VALUES
    ('North Indian',         'north-indian',      'CUISINE', 10),
    ('South Indian',         'south-indian',      'CUISINE', 20),
    ('Mughlai',              'mughlai',           'CUISINE', 30),
    ('Biryani',              'biryani',           'CUISINE', 40),
    ('Chaat & Street Food',  'chaat-street-food', 'CUISINE', 50),
    ('Coastal & Seafood',    'coastal-seafood',   'CUISINE', 60),
    ('Goan',                 'goan',              'CUISINE', 70),
    ('Maharashtrian',        'maharashtrian',     'CUISINE', 80),
    ('Indo-Chinese',         'indo-chinese',      'CUISINE', 90),
    ('Cafe & Bakery',        'cafe-bakery',       'CUISINE', 100),
    ('Desserts',             'desserts',          'CUISINE', 110),
    ('Tiffin Room',          'tiffin-room',       'DINING_STYLE', 10),
    ('Tandoor',              'tandoor',           'DINING_STYLE', 20),
    ('Pure Vegetarian',      'pure-vegetarian',   'DINING_STYLE', 30),
    ('Family Dining',        'family-dining',     'DINING_STYLE', 40),
    ('Quick Bites',          'quick-bites',       'DINING_STYLE', 50);

-- Every provider starts as MANUAL: prices are entered by people, not fetched.
INSERT INTO delivery_providers (name, slug, website_url, integration_type, direct_channel, sort_order) VALUES
    ('Swiggy',       'swiggy',       'https://www.swiggy.com', 'MANUAL', FALSE, 10),
    ('Zomato',       'zomato',       'https://www.zomato.com', 'MANUAL', FALSE, 20),
    ('Direct order', 'direct-order', NULL,                     'MANUAL', TRUE,  30);
