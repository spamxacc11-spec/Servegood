package com.servegood.config;

import com.servegood.entity.Advertisement;
import com.servegood.entity.AdvertisementCampaign;
import com.servegood.entity.DeliveryPrice;
import com.servegood.entity.DeliveryProvider;
import com.servegood.entity.HygieneAudit;
import com.servegood.entity.HygieneAuditItem;
import com.servegood.entity.Menu;
import com.servegood.entity.MenuItem;
import com.servegood.entity.OpeningHours;
import com.servegood.entity.Restaurant;
import com.servegood.entity.RestaurantAddress;
import com.servegood.entity.RestaurantImage;
import com.servegood.entity.RestaurantOwner;
import com.servegood.entity.Review;
import com.servegood.entity.ReviewerAssignment;
import com.servegood.entity.StoredFile;
import com.servegood.entity.User;
import com.servegood.entity.enums.AdPlacement;
import com.servegood.entity.enums.AssignmentStatus;
import com.servegood.entity.enums.AuditStatus;
import com.servegood.entity.enums.CampaignStatus;
import com.servegood.entity.enums.FilePurpose;
import com.servegood.entity.enums.HygieneCategory;
import com.servegood.entity.enums.PaymentStatus;
import com.servegood.entity.enums.PriceSource;
import com.servegood.entity.enums.RestaurantStatus;
import com.servegood.entity.enums.ReviewStatus;
import com.servegood.entity.enums.RoleName;
import com.servegood.repository.AdvertisementCampaignRepository;
import com.servegood.repository.DeliveryPriceRepository;
import com.servegood.repository.DeliveryProviderRepository;
import com.servegood.repository.HygieneAuditRepository;
import com.servegood.repository.MenuItemRepository;
import com.servegood.repository.MenuRepository;
import com.servegood.repository.RestaurantCategoryRepository;
import com.servegood.repository.RestaurantDeliveryOptionRepository;
import com.servegood.repository.RestaurantOwnerRepository;
import com.servegood.repository.RestaurantRepository;
import com.servegood.repository.ReviewRepository;
import com.servegood.repository.ReviewerAssignmentRepository;
import com.servegood.repository.RoleRepository;
import com.servegood.repository.StoredFileRepository;
import com.servegood.repository.UserRepository;
import com.servegood.service.RestaurantService;
import com.servegood.service.delivery.DeliveryService;
import com.servegood.service.storage.StorageService;
import com.servegood.service.support.HygieneScoring;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Opt-in demo content for local development (SEED_DEMO=true plus
 * SEED_DEMO_PASSWORD). Creates demo accounts on the reserved .test domain and
 * six fictional restaurants in Andheri, Mumbai. Runs only on an empty database
 * and must never be enabled in production.
 */
@Component
@Order(2)
public class DemoDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

    private final AppProperties props;
    private final UserRepository users;
    private final RoleRepository roles;
    private final RestaurantRepository restaurants;
    private final RestaurantCategoryRepository categories;
    private final RestaurantOwnerRepository owners;
    private final MenuRepository menus;
    private final MenuItemRepository menuItems;
    private final ReviewRepository reviews;
    private final HygieneAuditRepository audits;
    private final ReviewerAssignmentRepository assignments;
    private final DeliveryProviderRepository providers;
    private final RestaurantDeliveryOptionRepository options;
    private final DeliveryPriceRepository prices;
    private final AdvertisementCampaignRepository campaigns;
    private final StoredFileRepository files;
    private final StorageService storage;
    private final RestaurantService restaurantService;
    private final PasswordEncoder encoder;
    private final Clock clock;

    public DemoDataSeeder(AppProperties props, UserRepository users, RoleRepository roles,
                          RestaurantRepository restaurants, RestaurantCategoryRepository categories,
                          RestaurantOwnerRepository owners, MenuRepository menus, MenuItemRepository menuItems,
                          ReviewRepository reviews, HygieneAuditRepository audits,
                          ReviewerAssignmentRepository assignments, DeliveryProviderRepository providers,
                          RestaurantDeliveryOptionRepository options, DeliveryPriceRepository prices,
                          AdvertisementCampaignRepository campaigns, StoredFileRepository files,
                          StorageService storage, RestaurantService restaurantService, PasswordEncoder encoder,
                          Clock clock) {
        this.props = props;
        this.users = users;
        this.roles = roles;
        this.restaurants = restaurants;
        this.categories = categories;
        this.owners = owners;
        this.menus = menus;
        this.menuItems = menuItems;
        this.reviews = reviews;
        this.audits = audits;
        this.assignments = assignments;
        this.providers = providers;
        this.options = options;
        this.prices = prices;
        this.campaigns = campaigns;
        this.files = files;
        this.storage = storage;
        this.restaurantService = restaurantService;
        this.encoder = encoder;
        this.clock = clock;
    }

    private record Dish(String section, String name, String description, int price, boolean veg) {}

    private record Quote(String provider, int food, int fees, int delivery, int discount) {}

    private record Seed(
            String name, String description, String image, String line1, String locality, String postalCode,
            double lat, double lng, int priceLevel, int costForTwo, List<String> categorySlugs, String basket,
            List<Dish> dishes, List<Quote> quotes, int[] hygieneScores, String findings, String recommendations,
            List<int[]> reviewRatings, List<String> reviewTexts, LocalTime opens, LocalTime closes) {}

    @Override
    @Transactional
    public void run(ApplicationArguments args) throws IOException {
        if (!props.seed().demo()) {
            return;
        }
        String password = props.seed().demoPassword();
        if (password == null || password.length() < 8) {
            log.warn("SEED_DEMO is on but SEED_DEMO_PASSWORD is missing or shorter than 8 characters; skipping demo data.");
            return;
        }
        if (restaurants.count() > 0) {
            log.info("Demo seed skipped: restaurants already exist.");
            return;
        }
        log.warn("Seeding DEMO data (fictional restaurants and accounts). Do not enable SEED_DEMO in production.");

        User admin = user("admin@servegood.test", "Asha Admin", password, RoleName.ADMIN);
        User owner = user("owner@servegood.test", "Rohan Mehta", password, RoleName.RESTAURANT_OWNER);
        User reviewer = user("reviewer@servegood.test", "Kavya Iyer", password, RoleName.REVIEWER);
        User diner = user("diner@servegood.test", "Priya Shah", password, RoleName.CONSUMER);
        User diner2 = user("diner2@servegood.test", "Arjun Nair", password, RoleName.CONSUMER);

        Map<String, DeliveryProvider> bySlug = new java.util.HashMap<>();
        providers.findAll().forEach(p -> bySlug.put(p.getSlug(), p));

        LocalDate today = LocalDate.now(clock);
        List<Restaurant> created = new ArrayList<>();
        for (Seed s : seeds()) {
            Restaurant r = restaurant(s);
            created.add(r);
            RestaurantOwner link = new RestaurantOwner();
            link.setRestaurant(r);
            link.setUser(owner);
            owners.save(link);
            menu(r, s.dishes());
            delivery(r, s, bySlug, admin);
            if (s.hygieneScores() != null) {
                audit(r, s, reviewer, admin, today.minusDays(20 + created.size() * 9));
            }
            List<User> authors = List.of(diner, diner2);
            for (int i = 0; i < s.reviewRatings().size() && i < authors.size(); i++) {
                review(r, authors.get(i), s.reviewRatings().get(i), s.reviewTexts().get(i), ReviewStatus.VERIFIED, admin,
                        today.minusDays(5 + i * 4L));
            }
            restaurantService.recomputeRatings(r.getId());
        }

        // A review waiting in the moderation queue, written by the reviewer account as a diner.
        review(created.get(4), reviewer, new int[] {3, 3, 4, 3},
                "Paneer was well charred but the naan came out cold on a busy Friday night. Staff were apologetic.",
                ReviewStatus.PENDING, null, today.minusDays(1));

        // An open assignment so the reviewer dashboard has work to do.
        ReviewerAssignment a = new ReviewerAssignment();
        a.setReviewer(reviewer);
        a.setRestaurant(created.get(3));
        a.setAssignedBy(admin);
        a.setDueDate(today.plusDays(10));
        a.setNotes("First full audit for this kitchen. Pay attention to frying oil handling.");
        assignments.save(a);

        // One active, clearly sponsored campaign.
        AdvertisementCampaign c = new AdvertisementCampaign();
        c.setRestaurant(created.get(5));
        c.setCreatedBy(owner);
        c.setName("Monsoon seafood week");
        c.setTargetLocation("Andheri");
        c.setStartDate(today.minusDays(2));
        c.setEndDate(today.plusDays(26));
        c.setBudget(new BigDecimal("25000.00"));
        c.setStatus(CampaignStatus.ACTIVE);
        c.setPaymentStatus(PaymentStatus.PAID);
        c.setReviewedBy(admin);
        c.setReviewedAt(Instant.now());
        for (AdPlacement p : List.of(AdPlacement.HOMEPAGE, AdPlacement.SEARCH_RESULTS)) {
            Advertisement ad = new Advertisement();
            ad.setCampaign(c);
            ad.setPlacement(p);
            ad.setHeadline("Fresh Versova catch, cooked the Koli way");
            c.getAdvertisements().add(ad);
        }
        campaigns.save(c);

        log.info("Demo data ready: {} restaurants. Demo accounts use the *@servegood.test emails and SEED_DEMO_PASSWORD.",
                created.size());
    }

    private User user(String email, String name, String password, RoleName role) {
        return users.findByEmailIgnoreCase(email).orElseGet(() -> {
            User u = new User();
            u.setEmail(email);
            u.setFullName(name);
            u.setPasswordHash(encoder.encode(password));
            u.getRoles().add(roles.findByName(role).orElseThrow());
            return users.save(u);
        });
    }

    private Restaurant restaurant(Seed s) throws IOException {
        Restaurant r = new Restaurant();
        r.setName(s.name());
        r.setSlug(com.servegood.service.support.Slugs.unique(s.name(), restaurants::existsBySlug));
        r.setDescription(s.description());
        r.setPriceLevel(s.priceLevel());
        r.setCostForTwo(s.costForTwo());
        r.setComparisonBasket(s.basket());
        r.setPhone("+91 22 0000 0000");
        r.setStatus(RestaurantStatus.APPROVED);
        String url = image(s.image());
        r.setCoverImageUrl(url);
        RestaurantImage img = new RestaurantImage();
        img.setRestaurant(r);
        img.setUrl(url);
        img.setAltText(s.name() + " signature dish");
        r.getImages().add(img);

        RestaurantAddress a = new RestaurantAddress();
        a.setLine1(s.line1());
        a.setLocality(s.locality());
        a.setCity("Mumbai");
        a.setState("Maharashtra");
        a.setPostalCode(s.postalCode());
        a.setLatitude(BigDecimal.valueOf(s.lat()).setScale(6));
        a.setLongitude(BigDecimal.valueOf(s.lng()).setScale(6));
        r.setAddress(a);

        for (String slug : s.categorySlugs()) {
            categories.findBySlug(slug).ifPresent(r.getCategories()::add);
        }
        for (int day = 1; day <= 7; day++) {
            OpeningHours h = new OpeningHours();
            h.setRestaurant(r);
            h.setDayOfWeek(day);
            h.setOpensAt(s.opens());
            h.setClosesAt(s.closes());
            r.getOpeningHours().add(h);
        }
        return restaurants.save(r);
    }

    private String image(String filename) throws IOException {
        String key = "restaurant/demo/" + filename;
        ClassPathResource resource = new ClassPathResource("seed-images/" + filename);
        String url;
        try (InputStream in = resource.getInputStream()) {
            url = storage.store(key, in, resource.contentLength(), "image/jpeg");
        }
        if (files.findAll().stream().noneMatch(f -> f.getStorageKey().equals(key))) {
            StoredFile f = new StoredFile();
            f.setStorageKey(key);
            f.setUrl(url);
            f.setOriginalFilename(filename);
            f.setContentType("image/jpeg");
            f.setSizeBytes(resource.contentLength());
            f.setPurpose(FilePurpose.RESTAURANT);
            files.save(f);
        }
        return url;
    }

    private void menu(Restaurant r, List<Dish> dishes) {
        Map<String, Menu> sections = new java.util.LinkedHashMap<>();
        int order = 0;
        for (Dish d : dishes) {
            Menu m = sections.get(d.section());
            if (m == null) {
                m = new Menu();
                m.setRestaurant(r);
                m.setName(d.section());
                m.setSortOrder(sections.size());
                menus.save(m);
                sections.put(d.section(), m);
            }
            MenuItem i = new MenuItem();
            i.setMenu(m);
            i.setRestaurant(r);
            i.setName(d.name());
            i.setDescription(d.description());
            i.setPrice(BigDecimal.valueOf(d.price()).setScale(2));
            i.setVegetarian(d.veg());
            i.setSortOrder(order++);
            menuItems.save(i);
        }
    }

    private void delivery(Restaurant r, Seed s, Map<String, DeliveryProvider> bySlug, User admin) {
        for (Quote q : s.quotes()) {
            DeliveryProvider p = bySlug.get(q.provider());
            if (p == null) {
                continue;
            }
            var o = new com.servegood.entity.RestaurantDeliveryOption();
            o.setRestaurant(r);
            o.setProvider(p);
            o.setOrderingUrl(p.getWebsiteUrl());
            o.setAvailable(true);
            options.save(o);
            DeliveryPrice price = new DeliveryPrice();
            price.setOption(o);
            price.setBasketDescription(s.basket());
            price.setFoodSubtotal(money(q.food()));
            price.setPlatformFee(money(q.fees()));
            price.setDeliveryFee(money(q.delivery()));
            price.setOtherFees(BigDecimal.ZERO.setScale(2));
            price.setDiscount(money(q.discount()));
            price.setFinalTotal(DeliveryService.finalTotal(price.getFoodSubtotal(), price.getDeliveryFee(),
                    price.getPlatformFee(), price.getOtherFees(), price.getDiscount()));
            price.setSource(PriceSource.ADMIN_MANUAL);
            price.setRecordedBy(admin);
            price.setRecordedAt(Instant.now().minusSeconds(3600L * 26));
            prices.save(price);
        }
    }

    private void audit(Restaurant r, Seed s, User reviewer, User admin, LocalDate date) {
        HygieneAudit a = new HygieneAudit();
        a.setRestaurant(r);
        a.setReviewer(reviewer);
        a.setAuditDate(date);
        HygieneCategory[] cats = HygieneCategory.values();
        for (int i = 0; i < cats.length; i++) {
            HygieneAuditItem item = new HygieneAuditItem();
            item.setAudit(a);
            item.setCategory(cats[i]);
            item.setScore(s.hygieneScores()[i]);
            item.setWeight(cats[i].weight());
            a.getItems().add(item);
        }
        a.setOverallScore(HygieneScoring.overallScore(a.getItems()));
        a.setFindings(s.findings());
        a.setRecommendations(s.recommendations());
        a.setStatus(AuditStatus.APPROVED);
        a.setSubmittedAt(Instant.now().minusSeconds(86400L * 3));
        a.setDecidedAt(Instant.now().minusSeconds(86400L * 2));
        a.setDecidedBy(admin);
        a.setValidUntil(date.plusMonths(props.hygiene().validityMonths()));
        audits.save(a);
        r.setHygieneScore(a.getOverallScore());
        r.setHygieneAuditId(a.getId());
        r.setHygieneVerifiedUntil(a.getValidUntil());

        ReviewerAssignment done = new ReviewerAssignment();
        done.setReviewer(reviewer);
        done.setRestaurant(r);
        done.setAssignedBy(admin);
        done.setStatus(AssignmentStatus.COMPLETED);
        assignments.save(done);
        a.setAssignment(done);
    }

    private void review(Restaurant r, User author, int[] ratings, String text, ReviewStatus status, User moderator,
                        LocalDate visit) {
        Review rv = new Review();
        rv.setRestaurant(r);
        rv.setUser(author);
        rv.setOverallRating(ratings[0]);
        rv.setFoodRating(ratings[1]);
        rv.setServiceRating(ratings[2]);
        rv.setHygieneRating(ratings[3]);
        rv.setComment(text);
        rv.setVisitDate(visit);
        rv.setStatus(status);
        if (moderator != null) {
            rv.setModeratedBy(moderator);
            rv.setModeratedAt(Instant.now());
        }
        reviews.save(rv);
    }

    private static BigDecimal money(int v) {
        return BigDecimal.valueOf(v).setScale(2);
    }

    private static List<Seed> seeds() {
        LocalTime noon = LocalTime.of(12, 0);
        LocalTime late = LocalTime.of(23, 30);
        return List.of(
                new Seed("Lokhandwala Dum Biryani House",
                        "Sealed-pot dum biryani and charcoal kebabs. Rice is layered and steamed in the pot it is served from.",
                        "biryani.jpg", "Shop 4, Lokhandwala Complex Back Road", "Lokhandwala, Andheri West", "400053",
                        19.142800, 72.826400, 2, 700, List.of("biryani", "mughlai", "family-dining"),
                        "1 chicken dum biryani, 1 seekh kebab plate",
                        List.of(new Dish("Biryani", "Chicken dum biryani", "Slow-cooked in a sealed handi with saffron rice", 340, false),
                                new Dish("Biryani", "Veg dum biryani", "Seasonal vegetables, fried onions, mint", 280, true),
                                new Dish("Kebabs", "Seekh kebab plate", "Four minced mutton kebabs off the charcoal grill", 260, false),
                                new Dish("Kebabs", "Paneer tikka", "Hung-curd marinade, tandoor finished", 240, true),
                                new Dish("Sides", "Burani raita", "Garlic yoghurt", 60, true)),
                        List.of(new Quote("swiggy", 486, 38, 29, 0), new Quote("zomato", 545, 45, 35, 40),
                                new Quote("direct-order", 470, 20, 79, 0)),
                        new int[] {9, 9, 10, 9, 9, 9, 8, 9},
                        "Dum pots kept covered between services. Steel prep surfaces wiped between orders. Spices stored in sealed, labelled containers.",
                        "Keep the cold-room door log up to date during the dinner rush.",
                        List.of(new int[] {5, 5, 4, 5}, new int[] {4, 5, 4, 4}),
                        List.of("Rice was fragrant and every grain separate. Kitchen is visible from the counter and looked spotless.",
                                "Kebabs were juicy and the biryani portion easily serves two. Delivery came ten minutes late."),
                        noon, late),
                new Seed("Chakala Tiffin Room",
                        "Idli, dosa and filter coffee from early morning. Batter is ground fresh twice a day.",
                        "dosa.jpg", "Ground floor, Chakala Road, near the Metro station", "Chakala, Andheri East", "400099",
                        19.111200, 72.861600, 1, 300, List.of("south-indian", "tiffin-room", "pure-vegetarian", "quick-bites"),
                        "2 ghee podi idli, 1 masala dosa, 2 filter coffee",
                        List.of(new Dish("Tiffin", "Ghee podi idli", "Two idli tossed in ghee and gunpowder", 90, true),
                                new Dish("Tiffin", "Masala dosa", "Crisp dosa, potato masala, sambar, chutneys", 120, true),
                                new Dish("Tiffin", "Medu vada", "Two vadas with sambar", 80, true),
                                new Dish("Drinks", "Filter coffee", "Decoction brewed through the morning", 45, true)),
                        List.of(new Quote("swiggy", 312, 31, 25, 0), new Quote("zomato", 305, 34, 29, 0),
                                new Quote("direct-order", 290, 15, 20, 0)),
                        new int[] {10, 9, 9, 9, 10, 9, 9, 8},
                        "Steamers cleaned between batches. Banana leaves rinsed before service. Filtered water at the counter.",
                        "Add a second hand-wash station near the dosa tawa.",
                        List.of(new int[] {5, 5, 5, 5}, new int[] {5, 4, 5, 5}),
                        List.of("Best filter coffee in Chakala. Idlis were soft and the podi had real heat.",
                                "Quick service at 8am even with the office crowd. Dosa was crisp all the way through."),
                        LocalTime.of(7, 0), LocalTime.of(22, 0)),
                new Seed("Four Bungalows Tandoor & Grill",
                        "North Indian curries and a busy clay tandoor. Breads are made to order.",
                        "tandoor.jpg", "12 J.P. Road, Four Bungalows", "Four Bungalows, Andheri West", "400053",
                        19.129000, 72.826000, 3, 1100, List.of("north-indian", "tandoor", "family-dining"),
                        "1 butter chicken, 4 tandoori roti, 1 dal makhani",
                        List.of(new Dish("Mains", "Butter chicken", "Tandoor chicken in tomato and butter gravy", 420, false),
                                new Dish("Mains", "Dal makhani", "Black lentils simmered overnight", 290, true),
                                new Dish("Breads", "Tandoori roti", "Whole wheat, from the clay oven", 40, true),
                                new Dish("Starters", "Tandoori chicken (half)", "Bone-in, charcoal smoked", 380, false)),
                        List.of(new Quote("swiggy", 742, 56, 39, 0), new Quote("zomato", 698, 61, 25, 0),
                                new Quote("direct-order", 680, 25, 89, 0)),
                        new int[] {7, 8, 8, 8, 8, 7, 7, 8},
                        "Produce washed on arrival and storage kept covered. Tandoor bay cleaning rota is not followed between lunch and dinner.",
                        "Introduce a signed cleaning rota for the tandoor bay between services; replace two cracked cutting boards.",
                        List.of(new int[] {4, 5, 3, 3}, new int[] {4, 4, 4, 4}),
                        List.of("Dal makhani is the reason to come. Service was slow and the table was sticky when we sat down.",
                                "Rotis came out hot and the butter chicken was not too sweet. Fair for the price."),
                        noon, LocalTime.of(0, 30)),
                new Seed("Marol Chaat & Chole House",
                        "Chole bhature, samosa chaat and masala chai near Marol Naka.",
                        "chole-bhature.jpg", "Andheri-Kurla Road, near Marol Naka", "Marol, Andheri East", "400059",
                        19.119700, 72.882600, 1, 350, List.of("chaat-street-food", "north-indian", "pure-vegetarian", "quick-bites"),
                        "1 chole bhature, 1 samosa chaat, 2 masala chai",
                        List.of(new Dish("Mains", "Chole bhature", "Two bhature, spiced chickpeas, pickled onion", 160, true),
                                new Dish("Chaat", "Samosa chaat", "Crushed samosa, chole, chutneys, sev", 90, true),
                                new Dish("Chaat", "Pani puri", "Six puris, tangy and sweet water", 60, true),
                                new Dish("Drinks", "Masala chai", "Ginger and cardamom", 25, true)),
                        List.of(new Quote("swiggy", 268, 26, 25, 0), new Quote("zomato", 252, 24, 22, 0),
                                new Quote("direct-order", 245, 15, 49, 0)),
                        null, null, null,
                        List.of(new int[] {4, 5, 4, 4}),
                        List.of("Bhature were huge and not greasy. Chai was strong. Gets crowded at lunch."),
                        LocalTime.of(9, 0), LocalTime.of(22, 30)),
                new Seed("Seven Bungalows Veg Tandoor",
                        "Vegetarian tandoor: paneer, mushrooms and seasonal vegetables off the grill.",
                        "paneer-tikka.jpg", "Versova Road, Seven Bungalows", "Seven Bungalows, Andheri West", "400061",
                        19.130500, 72.818000, 2, 800, List.of("north-indian", "tandoor", "pure-vegetarian"),
                        "1 paneer tikka platter, 2 butter naan, 1 dal tadka",
                        List.of(new Dish("Starters", "Paneer tikka platter", "Paneer, peppers and onion, tandoor grilled", 320, true),
                                new Dish("Starters", "Tandoori mushrooms", "Button mushrooms in ajwain marinade", 260, true),
                                new Dish("Mains", "Dal tadka", "Yellow dal with ghee and cumin tempering", 200, true),
                                new Dish("Breads", "Butter naan", "Leavened, from the clay oven", 60, true)),
                        List.of(new Quote("swiggy", 512, 44, 29, 0), new Quote("zomato", 535, 48, 35, 50),
                                new Quote("direct-order", 495, 20, 39, 0)),
                        new int[] {8, 6, 8, 8, 8, 8, 7, 8},
                        "Marinades held in covered steel and dated. Cold storage was running warmer than the checklist allows.",
                        "Fit a thermometer log on the walk-in fridge and service the compressor; re-check within 30 days.",
                        List.of(new int[] {4, 4, 4, 4}, new int[] {5, 5, 4, 4}),
                        List.of("Paneer was soft with a good char. Portions are generous for the price.",
                                "Mushrooms were the surprise hit. Clean washrooms, which says a lot."),
                        noon, LocalTime.of(23, 0)),
                new Seed("Versova Koli Fish Curry House",
                        "Koli-style coastal cooking with the day's catch from Versova. Fish curry thalis and prawn fry.",
                        "fish-curry.jpg", "Versova Village Road, near the jetty", "Versova, Andheri West", "400061",
                        19.135100, 72.814600, 2, 900, List.of("coastal-seafood", "maharashtrian", "family-dining"),
                        "1 fish curry rice thali, 1 prawn koliwada",
                        List.of(new Dish("Thalis", "Fish curry rice thali", "Surmai curry, rice, sol kadhi, bhakri", 380, false),
                                new Dish("Starters", "Prawn koliwada", "Batter-fried prawns, Koli masala", 340, false),
                                new Dish("Starters", "Bombil fry", "Bombay duck, rava crusted", 260, false),
                                new Dish("Drinks", "Sol kadhi", "Kokum and coconut milk", 70, true)),
                        List.of(new Quote("swiggy", 425, 32, 25, 0), new Quote("zomato", 448, 41, 25, 0),
                                new Quote("direct-order", 420, 18, 59, 0)),
                        new int[] {9, 10, 9, 9, 9, 9, 9, 8},
                        "Catch iced on arrival and cleaned at a separate sink. Raw and cooked boards colour coded. Floor drains clear at close.",
                        "Label ice-box contents with arrival time.",
                        List.of(new int[] {5, 5, 4, 5}, new int[] {4, 4, 4, 5}),
                        List.of("The surmai was clearly caught that morning. Sol kadhi was perfect.",
                                "Prawn koliwada was crisp. A bit pricey but the fish quality justifies it."),
                        noon, LocalTime.of(23, 0)));
    }
}
