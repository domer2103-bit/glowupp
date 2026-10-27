import type { FaqItem } from "@/lib/seo";
import { LEAD_FEE_CAP_PENCE, LEAD_FEE_RATE, PRIVATE_LINK_FREE_JOBS } from "@/lib/fees";
import { formatPence } from "@/lib/money";

/**
 * GlowUpp blog: practical guides for homeowners (and, later, tradespeople). Posts live here as plain data so they are
 * type-checked, appear in the sitemap automatically and need no CMS or extra dependency.
 *
 * Rules for writing posts: no invented prices or statistics (give ranges only when sourced), say when something is a
 * rule of thumb, and send readers to a professional for anything structural, electrical or gas related.
 */
export type BlogBlock =
  | { type: "h2"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] };

export interface BlogPost {
  slug: string;
  /** Who the post is written for. Tradespeople posts end with a call to action to /professionals instead of the redesign tool. */
  audience?: "homeowner" | "professional";
  title: string;
  /** Meta description and the card summary on /blog (keep to about 155 characters). */
  description: string;
  /** ISO date the post was first published. */
  published: string;
  /** Category key (src/lib/homepage-categories.ts): picks the call-to-action link and the example image. */
  category: string;
  /** What to call the room in the call-to-action when it differs from the category's own name (e.g. a dining room uses the living-room redesign tool). */
  ctaNoun?: string;
  heroSrc: string;
  heroAlt: string;
  intro: string;
  blocks: BlogBlock[];
  faq: FaqItem[];
  /** Slugs of other posts to link to at the end. */
  related: string[];
}

/** GlowUpp's own fee, read from the real fee constants so a post can never drift from what the product charges. */
const FEE_PERCENT = `${Math.round(LEAD_FEE_RATE * 100)}%`;
const FEE_CAP = formatPence(LEAD_FEE_CAP_PENCE);

const NOT_ADVICE =
  "Always ask a qualified professional before moving gas, electrics or plumbing, or changing anything structural, and check your lease or local rules if you rent or live in a conservation area.";

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "kitchen-ideas-small-terraced-house",
    title: "Kitchen ideas for a small UK terraced house",
    description: "Layout, colour, storage and lighting ideas for a narrow or galley kitchen in a UK terrace, plus the mistakes to avoid before you spend anything.",
    published: "2026-10-27",
    category: "kitchen",
    heroSrc: "/homepage/kitchen.jpg",
    heroAlt: "A dated small kitchen next to an AI redesign of the same room with navy units",
    intro:
      "Many UK terraced houses have a narrow galley kitchen or a small room at the back of the house. They are tight, but they can be bright, practical and good-looking if you plan the layout first and keep the design simple.",
    blocks: [
      { type: "h2", text: "Start with the layout you already have" },
      {
        type: "p",
        text: "The cheapest and least disruptive kitchen change keeps the sink, hob and appliances roughly where the plumbing, gas and electrics already are. In a galley kitchen, two straight runs facing each other usually work best, with about a metre of walking space between them as a rule of thumb. In a small L-shaped room, keep the corner usable rather than losing it to an awkward cupboard.",
      },
      { type: "h2", text: "Choose colour carefully in a small room" },
      {
        type: "p",
        text: "Pale walls and a light floor make a small kitchen feel bigger. You do not have to stay white: a deep colour such as navy or green on the base units, with lighter walls and wall units, adds character without closing the room in. Keep to two or three colours and repeat them, so the room feels calm rather than busy.",
      },
      { type: "h2", text: "Use the height, not just the floor space" },
      {
        type: "ul",
        items: [
          "Take wall units up to the ceiling so there is storage where it is normally wasted.",
          "Add a slim pull-out larder or a shelf unit in a narrow gap instead of leaving dead space.",
          "Use a rail and hooks or open shelves for the things you reach for every day.",
        ],
      },
      { type: "h2", text: "Pick slimmer appliances and fewer of them" },
      {
        type: "p",
        text: "A slimline dishwasher, an integrated fridge-freezer and a compact oven can free up a lot of worktop in a small kitchen. Think about how you really cook before you buy: a second oven you rarely use takes space you may want for preparation.",
      },
      { type: "h2", text: "Get the lighting right" },
      {
        type: "p",
        text: "A single ceiling light leaves worktops in shadow. Add lighting under the wall units so you can see what you are chopping, and keep the window clear where you can. If there is a door to the garden, a glazed door brings in a surprising amount of daylight.",
      },
      { type: "h2", text: "Mistakes to avoid" },
      {
        type: "ul",
        items: [
          "Ordering units before the room has been measured by the fitter.",
          "Too many colours and finishes in one small room.",
          "Forgetting ventilation: a cooker hood or extractor matters more in a small kitchen.",
          "Skipping storage planning, then living with clutter on every surface.",
        ],
      },
      { type: "h2", text: "See it before you commit" },
      {
        type: "p",
        text: "Colour and layout are hard to picture from a catalogue. With GlowUpp you upload a photo of your own kitchen and see AI-generated versions of it in different styles, which makes it much easier to decide what you want and to explain it to a kitchen fitter. " + NOT_ADVICE,
      },
    ],
    faq: [
      {
        question: "What is the best layout for a narrow kitchen?",
        answer: "A galley layout with two parallel runs, or one straight run if the room is very narrow, usually makes the best use of space. Keeping the sink and appliances near their existing pipes and power also keeps the job simpler.",
      },
      {
        question: "What colour makes a small kitchen look bigger?",
        answer: "Light walls and a light floor help most. You can still use a deep colour on the base units if the rest of the room stays light and you keep the number of colours low.",
      },
      {
        question: "Can I change my kitchen layout myself?",
        answer: "Choosing the design is up to you, but moving gas, electrics or plumbing, or removing a wall, should be done by qualified professionals and may need building regulations approval. Ask your installer.",
      },
    ],
    related: ["small-bathroom-ideas", "living-room-colour-ideas"],
  },
  {
    slug: "small-bathroom-ideas",
    title: "Small bathroom ideas that make the room feel bigger",
    description: "Simple ways to make a small bathroom feel bigger: layout, tiles, fittings, lighting and ventilation, with common mistakes to avoid.",
    published: "2026-10-27",
    category: "bathroom",
    heroSrc: "/homepage/bathroom.jpg",
    heroAlt: "A tired small bathroom next to an AI redesign with green tiles and a glass shower screen",
    intro:
      "A small bathroom does not have to feel cramped. A few well-chosen changes to the fittings, tiles and light can make the same floor area feel much more open.",
    blocks: [
      { type: "h2", text: "Show more floor" },
      {
        type: "p",
        text: "The more floor you can see, the bigger a room looks. Wall-hung toilets and basins, or a slim vanity with open space underneath, make a noticeable difference. A smaller basin placed well often works better than a large one that crowds the room.",
      },
      { type: "h2", text: "Think about a walk-in shower" },
      {
        type: "p",
        text: "Swapping a bath for a walk-in shower can free up space and make the room feel lighter. Decide first how you use the room. If it is the only bathroom in a family home, keeping a bath may matter to you or to a future buyer, so it is worth thinking through before you commit.",
      },
      { type: "h2", text: "Choose glass instead of curtains" },
      {
        type: "p",
        text: "A clear glass screen lets the eye travel to the far wall, so the room feels larger than it does with a curtain or a frosted panel. A fixed screen is often neater and easier to keep clean than a hinged door.",
      },
      { type: "h2", text: "Pick tiles to match the room" },
      {
        type: "ul",
        items: [
          "Larger tiles mean fewer grout lines and a calmer, less busy surface.",
          "Using the same or a similar tile on the floor and walls blends the edges of the room.",
          "Light colours reflect more light. If you love a darker colour, use it confidently on one wall or the whole room rather than in small patches.",
        ],
      },
      { type: "h2", text: "Add light and a mirror" },
      {
        type: "p",
        text: "Good lighting does a lot. Use a bright but soft light overhead and add light around the mirror so your face is lit evenly. A large mirror, or a mirror cabinet, doubles the sense of space and gives you storage at the same time.",
      },
      { type: "h2", text: "Do not forget ventilation and waterproofing" },
      {
        type: "p",
        text: "Small bathrooms trap steam, which leads to damp and mould if the air cannot escape. Make sure there is an extractor fan that works, and that wet areas are properly waterproofed before tiling. Ask your fitter how they handle both.",
      },
      { type: "h2", text: "Mistakes to avoid" },
      {
        type: "ul",
        items: [
          "A bulky vanity that eats the floor space.",
          "Lots of small, patterned tiles in a tiny room.",
          "Hiding clutter on the edge of the bath instead of planning niches or shelves.",
          "Choosing everything from a showroom without checking measurements.",
        ],
      },
      { type: "h2", text: "Try the look before you buy" },
      {
        type: "p",
        text: "Upload a photo of your bathroom to GlowUpp and see AI-generated redesigns with different tiles, colours and fittings, so you can decide what you want before you order anything. " + NOT_ADVICE,
      },
    ],
    faq: [
      {
        question: "How can I make a small bathroom look bigger?",
        answer: "Show more floor with wall-hung or slim fittings, use a clear glass screen, choose larger tiles with fewer grout lines, and add good lighting and a large mirror.",
      },
      {
        question: "Is a walk-in shower better than a bath in a small bathroom?",
        answer: "A walk-in shower usually frees up space, but a bath may matter if it is your only bathroom or you have young children. Think about how you use the room and about future buyers.",
      },
      {
        question: "Do dark tiles make a small bathroom feel smaller?",
        answer: "They can if used in small patches, but a darker colour used boldly across a whole room can feel cosy and deliberate. Good lighting matters more with dark colours.",
      },
    ],
    related: ["kitchen-ideas-small-terraced-house", "living-room-colour-ideas"],
  },
  {
    slug: "small-garden-ideas-uk-terrace",
    title: "Small garden ideas for a UK terrace",
    description: "Make a small terraced-house garden work harder: zones, vertical planting, paving, shade planting, privacy and storage, plus a front-garden rule to know.",
    published: "2026-10-27",
    category: "garden",
    heroSrc: "/homepage/garden.jpg",
    heroAlt: "A bare terrace back garden next to an AI redesign with lawn, path and planting",
    intro:
      "Terraced back gardens are often narrow, overlooked and a little shady. With a clear plan they can still give you somewhere to sit, something green to look at and a place for the bins and bikes.",
    blocks: [
      { type: "h2", text: "Plan in zones" },
      {
        type: "p",
        text: "Decide what the garden needs to do before you buy anything: a place to sit, some planting, and somewhere to store the things that otherwise end up in the way. Even in a small space, separating these jobs makes it feel more designed and less crowded.",
      },
      { type: "h2", text: "Go up, not just across" },
      {
        type: "ul",
        items: [
          "Fix trellis to a wall or fence and grow climbers up it.",
          "Use wall-mounted planters or shelves for herbs and flowers.",
          "Plant a narrow bed along the fence line so the middle stays open.",
        ],
      },
      { type: "h2", text: "Choose surfaces to suit the space" },
      {
        type: "p",
        text: "Paving or decking in a light colour makes a small garden feel bigger, and laying paving or boards on the diagonal can make the space seem wider. If you want a lawn, keep it a simple shape rather than a tiny patch broken up by pots.",
      },
      { type: "h2", text: "Plant for the light you have" },
      {
        type: "p",
        text: "Terrace gardens are often shaded by neighbouring walls. Work with that by choosing plants that cope with shade, such as hostas, ferns and hydrangeas, and add evergreen shrubs so the garden does not look empty in winter. Check the plant label for how much sun it needs before you buy.",
      },
      { type: "h2", text: "Make it private" },
      {
        type: "p",
        text: "A slatted fence panel, a screen of climbers or a few tall planters can make a small garden feel more private without making it feel boxed in. Soft evening lighting, such as solar or low-voltage lights, makes it usable after dark.",
      },
      { type: "h2", text: "Be careful with the front garden" },
      {
        type: "p",
        text: "If you plan to pave over a front garden, check the rules first. In England, covering a larger area with hard surfacing that does not let water drain away usually needs planning permission, unless the water drains to a lawn or border. Ask your local council or your landscaper.",
      },
      { type: "h2", text: "Mistakes to avoid" },
      {
        type: "ul",
        items: [
          "Filling every corner with pots until there is nowhere to sit.",
          "Choosing sun-loving plants for a shaded wall.",
          "Forgetting storage, so tools and bins stay in view.",
          "Buying large furniture before measuring the space.",
        ],
      },
      { type: "h2", text: "See your garden finished first" },
      {
        type: "p",
        text: "Upload a photo of your garden to GlowUpp and see AI-generated versions with different layouts, paving and planting, then share the one you like with a local landscaper to get a quote. " + NOT_ADVICE,
      },
    ],
    faq: [
      {
        question: "How do I make a small garden look bigger?",
        answer: "Use light-coloured paving, lay it on the diagonal, grow plants up walls and fences, and keep the middle of the space open instead of filling it with pots.",
      },
      {
        question: "What grows well in a shady terrace garden?",
        answer: "Hostas, ferns and hydrangeas cope well with shade, and evergreen shrubs keep the garden looking full in winter. Always check the plant label for its light needs.",
      },
      {
        question: "Do I need planning permission to pave my front garden?",
        answer: "In England, hard surfacing a larger area of front garden with a material that does not let water drain away usually needs planning permission unless the water drains to a lawn or border. Check with your local council.",
      },
    ],
    related: ["front-door-exterior-colour-ideas", "kitchen-ideas-small-terraced-house"],
  },
  {
    slug: "front-door-exterior-colour-ideas",
    title: "Front door and exterior colour ideas for your house",
    description: "How to choose a front door and exterior colours that suit your brick, render and street, plus the rules to check first in a conservation area or leasehold home.",
    published: "2026-10-27",
    category: "exterior",
    heroSrc: "/homepage/exterior.jpg",
    heroAlt: "A tired grey house front next to an AI redesign with white render and a navy front door",
    intro:
      "The front of your house is the first thing visitors see, and a fresh colour scheme is one of the biggest changes you can make for the least disruption. A little planning stops it from looking out of place.",
    blocks: [
      { type: "h2", text: "Start with what you cannot change" },
      {
        type: "p",
        text: "Your brick, roof tiles and pavement are fixed, so choose colours that work with them. Red brick suits deep greens, navy and charcoal. Pale stock brick and render suit almost anything, from soft greys to bold colours. Stand across the road and look at the whole house, not just the door.",
      },
      { type: "h2", text: "Doors that rarely go wrong" },
      {
        type: "ul",
        items: [
          "Navy or deep blue: works with brick, render and stone.",
          "Dark green: a classic on older terraces and period houses.",
          "Charcoal or black: smart and modern, especially with brass or black door furniture.",
          "Soft muted colours such as sage or grey-blue: gentler, good on pale walls.",
        ],
      },
      { type: "h2", text: "Match the age and style of the house" },
      {
        type: "p",
        text: "Period houses often look best with traditional colours, while a modern house can carry something bolder. Look at the other houses in your street for what suits the area, and decide whether you want to blend in or stand out a little.",
      },
      { type: "h2", text: "Check the rules before you paint" },
      {
        type: "p",
        text: "Repainting a front door usually does not need planning permission, but conservation areas, listed buildings and leasehold or management-company rules can restrict colours or changes to the front of the house. If you are not sure, ask your council or landlord before you buy paint.",
      },
      { type: "h2", text: "Details that finish the look" },
      {
        type: "ul",
        items: [
          "Door furniture, a clear house number and a good light make the door feel looked after.",
          "Matching window frames in a dark neutral give a crisp look against light walls.",
          "A pair of planters beside the door adds colour that you can change with the seasons.",
        ],
      },
      { type: "h2", text: "If you are repainting or rendering the walls" },
      {
        type: "p",
        text: "White, off-white and soft greys are popular and keep the house looking bright, but they show dirt more. Prepare the wall properly, use paint made for exterior masonry, and test a patch in the weather before you commit.",
      },
      { type: "h2", text: "Mistakes to avoid" },
      {
        type: "ul",
        items: [
          "Choosing from a tiny swatch in a shop and not in daylight on the house.",
          "Skipping preparation: paint on a damp or flaking surface will not last.",
          "Forgetting how the colour looks next to the neighbours' houses.",
        ],
      },
      { type: "h2", text: "Try colours before you buy the paint" },
      {
        type: "p",
        text: "Upload a photo of the front of your house to GlowUpp and see AI-generated versions with different door and wall colours, then share the one you like with a local decorator or builder. " + NOT_ADVICE,
      },
    ],
    faq: [
      {
        question: "What colour front door goes with red brick?",
        answer: "Deep green, navy and charcoal all work well with red brick. Cream or soft grey can also look good, depending on the style of the house.",
      },
      {
        question: "Do I need permission to paint my front door?",
        answer: "Usually not, but conservation areas, listed buildings and leasehold or management-company rules can restrict colours. Check before you buy paint if you are unsure.",
      },
      {
        question: "What colour should I paint the outside walls?",
        answer: "White, off-white and light greys keep a house looking bright and go with most doors. They show dirt more than darker colours, so consider how much upkeep you want.",
      },
    ],
    related: ["small-garden-ideas-uk-terrace", "living-room-colour-ideas"],
  },
  {
    slug: "living-room-colour-ideas",
    title: "Living room colour ideas: navy, sage green and warm neutrals",
    description: "How to choose a living room colour: navy, sage green and warm neutrals, how light changes them, and mistakes to avoid before you buy paint.",
    published: "2026-10-27",
    category: "living-room",
    heroSrc: "/homepage/living-room.jpg",
    heroAlt: "A tired living room next to an AI redesign with navy walls and white panelling",
    intro:
      "Colour changes a living room more than almost anything else for the money. The trick is to choose a colour that suits the light in the room and the way you use it, rather than picking one from a swatch and hoping for the best.",
    blocks: [
      { type: "h2", text: "Look at your light first" },
      {
        type: "p",
        text: "North-facing rooms get cooler, softer light, which can make cool colours feel flat. South-facing rooms are warm and bright and can carry almost anything. Whatever the direction, the same paint looks different in the morning and the evening, so check it at both times.",
      },
      { type: "h2", text: "Navy: cosy and confident" },
      {
        type: "p",
        text: "Deep blue gives a living room a sense of calm and works especially well in the evening. It pairs well with white panelling or white skirting, warm wood and brass or black details. In a small or dark room, use it on all the walls and let it feel like a deliberate, cosy choice, rather than on one wall only.",
      },
      { type: "h2", text: "Sage green: soft and natural" },
      {
        type: "p",
        text: "Muted greens relax a room and sit comfortably with natural materials such as oak, linen and wool. They suit rooms with plants and good daylight, and they work in both traditional and modern houses.",
      },
      { type: "h2", text: "Warm neutrals: easy and flexible" },
      {
        type: "p",
        text: "Soft creams, stone and warm greys keep a room bright and are easy to live with, and they let your furniture and art do the talking. If you worry about a room looking plain, add interest with texture, such as a rug, curtains and cushions, rather than more colour.",
      },
      { type: "h2", text: "A simple rule for combining colours" },
      {
        type: "p",
        text: "A common design rule of thumb is about 60% a main colour (usually the walls), 30% a second colour (furniture and curtains) and 10% an accent (cushions, art and accessories). It stops a room from becoming a mix of competing colours.",
      },
      { type: "h2", text: "Test before you commit" },
      {
        type: "ul",
        items: [
          "Paint a large sample or use a sample pot on a big piece of lining paper and move it around the room.",
          "Look at it in daylight and with the lights on in the evening.",
          "Choose the finish too: matt is soft and hides flaws, while a slight sheen is easier to wipe clean.",
        ],
      },
      { type: "h2", text: "Mistakes to avoid" },
      {
        type: "ul",
        items: [
          "Judging a colour by how it looks on a screen.",
          "Forgetting the ceiling and woodwork, which change how the walls look.",
          "Using too many colours at once.",
        ],
      },
      { type: "h2", text: "See it in your own room" },
      {
        type: "p",
        text: "Upload a photo of your living room to GlowUpp and see AI-generated versions with different wall colours and styles, then share your favourite with a local decorator for a quote. " + NOT_ADVICE,
      },
    ],
    faq: [
      {
        question: "What colour makes a living room look bigger?",
        answer: "Light, warm neutrals reflect the most light and make a room feel more open. A deep colour used confidently on all the walls can also work if the room has good lighting.",
      },
      {
        question: "Is navy too dark for a living room?",
        answer: "Not necessarily. Navy works well in many living rooms, especially with white panelling, warm wood and good lighting. Test a large sample in your own light before committing.",
      },
      {
        question: "What goes with sage green walls?",
        answer: "Natural wood, cream or white woodwork, linen and brass or black details all work well with sage green.",
      },
    ],
    related: ["kitchen-ideas-small-terraced-house", "small-bathroom-ideas", "dining-room-ideas-panelling-dark-walls"],
  },
  {
    slug: "kids-bedroom-ideas-that-grow-with-your-child",
    title: "Kids' bedroom ideas that grow with your child",
    description: "How to design a child's bedroom that lasts: a calm base, furniture and storage that grow with them, and the safety points to check for cords, bunks and tall furniture.",
    published: "2026-10-27",
    category: "kids-room",
    heroSrc: "/homepage/kids-room.jpg",
    heroAlt: "A messy child's bedroom next to an AI redesign with blue walls, a bed with storage and a desk",
    intro:
      "Children grow fast and change their minds even faster. A bedroom that works for years has a calm, simple base, and puts the personality into things that are cheap and easy to swap.",
    blocks: [
      { type: "h2", text: "Keep the base simple" },
      {
        type: "p",
        text: "Walls, floor and the biggest furniture are the expensive, disruptive things to change, so keep them calm and flexible: a soft colour on the walls, a floor that takes a beating, and furniture in plain, durable finishes. The themes children love this year can then be added with bedding, posters, lamps and a single accent wall.",
      },
      { type: "h2", text: "Choose paint that survives childhood" },
      {
        type: "p",
        text: "Pick a washable finish so marks wipe off, and look for a paint with low odour so the room is comfortable to sleep in soon after decorating. Check the tin for how long to leave the room ventilated before a child sleeps there.",
      },
      { type: "h2", text: "Furniture that lasts" },
      {
        type: "ul",
        items: [
          "A good bed in a standard size lasts longer than a novelty one. Beds with drawers underneath add storage without taking floor space.",
          "A desk by the window gives homework somewhere to happen later, and a play table in the same place for now.",
          "Adjustable shelves and an open wardrobe layout let you change what goes where as needs change.",
        ],
      },
      { type: "h2", text: "Storage at their level" },
      {
        type: "p",
        text: "A room tidies itself much more easily when the child can reach the storage. Use low shelves, open boxes and baskets for toys and clothes, and keep a high shelf for the things you want to keep out of reach. A simple system you can keep up beats an elaborate one you will not.",
      },
      { type: "h2", text: "Zones: sleep, play and study" },
      {
        type: "p",
        text: "Even a small room works better when it has clear areas. Keep the bed away from the noisy, bright part of the room, give play space a rug and give study a desk with good light. As your child gets older, the play area can become a reading corner or a place for friends.",
      },
      { type: "h2", text: "Safety points to check" },
      {
        type: "ul",
        items: [
          "Blind and curtain cords are a strangulation risk. Choose cordless blinds, or fix cords well out of reach of cots and beds.",
          "Fix tall furniture such as wardrobes and bookcases to the wall so it cannot tip over.",
          "Bunk beds are usually advised against for children under six. Check the guidance on the bed you are considering.",
          "Upstairs windows should have restrictors that limit how far they open.",
        ],
      },
      { type: "h2", text: "Mistakes to avoid" },
      {
        type: "ul",
        items: [
          "Painting the whole room in a strong character theme that you will have to redo in two years.",
          "Buying furniture sized only for a toddler.",
          "Putting the toy storage where the child cannot reach it.",
          "Leaving cords or tall furniture unsecured.",
        ],
      },
      { type: "h2", text: "Try ideas on the real room" },
      {
        type: "p",
        text: "Upload a photo of the room to GlowUpp and see AI-generated versions with different colours and layouts, then share your favourite with a local decorator or fitter for a quote. " + NOT_ADVICE,
      },
    ],
    faq: [
      {
        question: "What colour is best for a child's bedroom?",
        answer: "Soft, calm colours such as light blue, sage or warm neutrals work well for sleep and age well. Add stronger colours in bedding, art and accessories that are easy to change.",
      },
      {
        question: "How do I make a kids' room last for years?",
        answer: "Keep walls, floor and large furniture simple and neutral, and put the personality into items that are cheap and quick to swap, such as bedding, posters and lamps.",
      },
      {
        question: "At what age can a child use a bunk bed?",
        answer: "Bunk beds are usually advised against for children under six. Check the manufacturer's guidance and the safety information for the bed you are considering.",
      },
    ],
    related: ["living-room-colour-ideas", "small-bathroom-ideas"],
  },
  {
    slug: "dining-room-ideas-panelling-dark-walls",
    title: "Dining room ideas: panelling and dark walls",
    description: "How to use dark paint and wall panelling in a dining room, with sizes for the table and lighting, and mistakes to avoid before you decorate.",
    published: "2026-10-27",
    category: "living-room",
    ctaNoun: "dining room",
    heroSrc: "/homepage/dining-room.jpg",
    heroAlt: "A damp, bare dining room next to an AI redesign with dark green walls, white panelling and a wooden table",
    intro:
      "A dining room is mostly used in the evening, which makes it one of the best rooms for a dark, rich colour. Add panelling and good lighting, and a plain room becomes somewhere you want to sit for hours.",
    blocks: [
      { type: "h2", text: "Why dark walls work in a dining room" },
      {
        type: "p",
        text: "Deep greens, navy and charcoal feel warm and intimate by candlelight and lamplight, and they make the table and the people around it the focus of the room. They also hide small imperfections in old walls. The key is to commit: a deep colour looks more confident across all the walls, and often the ceiling, than on one wall only.",
      },
      { type: "h2", text: "Add panelling" },
      {
        type: "p",
        text: "Wall panelling adds depth and texture and protects the wall behind the chairs. It is often fitted to roughly between a third and half of the wall height, and painted the same colour as the wall or in a lighter shade for contrast. A joiner can fit it, or a confident DIYer can use ready-made panels. Either way, take your time over measuring and finishing.",
      },
      { type: "h2", text: "Get the table and space right" },
      {
        type: "ul",
        items: [
          "Leave about 90 cm around the table so chairs can be pulled out and people can pass behind them.",
          "Choose a table that fits the room and the people you really have to seat, not the biggest one that will squeeze in.",
          "A rug that is large enough for the chairs to stay on when pulled out protects the floor and anchors the room.",
        ],
      },
      { type: "h2", text: "Light in layers" },
      {
        type: "p",
        text: "A single bright ceiling light flattens a dark room. Hang a pendant over the table at roughly 75 cm above the tabletop as a rule of thumb, add wall lights or a lamp on a sideboard, and put the lights on dimmers so you can set the mood for dinner or homework.",
      },
      { type: "h2", text: "If your dining space is part of a kitchen" },
      {
        type: "p",
        text: "In an open kitchen-diner, use colour, a rug and a pendant to mark out the dining area without building a wall. A darker colour on the dining side can sit well next to a lighter kitchen, as long as they share a link such as the same wood or metal finish.",
      },
      { type: "h2", text: "Mistakes to avoid" },
      {
        type: "ul",
        items: [
          "Painting a dark colour only on one wall, which can look unfinished.",
          "Skipping the prep: dark colours show uneven walls, so fill and sand first.",
          "Relying on one ceiling light.",
          "Choosing a table that leaves no room to move.",
        ],
      },
      { type: "h2", text: "See it in your own room" },
      {
        type: "p",
        text: "Upload a photo of your dining room to GlowUpp and see AI-generated versions with different wall colours and panelling, then share the one you like with a local decorator or joiner for a quote. " + NOT_ADVICE,
      },
    ],
    faq: [
      {
        question: "Are dark walls too much for a small dining room?",
        answer: "Not necessarily. Dark colours can make a small room feel cosy and deliberate if you use them across all the walls and add good lighting. A dining room is mostly used in the evening, which suits them.",
      },
      {
        question: "What goes with dark green walls?",
        answer: "White or cream panelling and woodwork, natural wood, brass or black details and soft linen curtains all work well with dark green.",
      },
      {
        question: "How high should dining room panelling be?",
        answer: "A common approach is between a third and half of the wall height. Choose a height that lines up with a window sill or a picture rail so it looks planned.",
      },
    ],
    related: ["living-room-colour-ideas", "kitchen-ideas-small-terraced-house"],
  },
  {
    slug: "patio-or-decking-uk-garden",
    title: "Patio or decking? Which suits a UK garden",
    description: "Patio or decking for your UK garden: how they compare on upkeep, slopes, drainage, grip and rules, and how to choose for your space.",
    published: "2026-10-27",
    category: "patio",
    heroSrc: "/homepage/patio.jpg",
    heroAlt: "A rotten old deck next to an AI redesign with new red-brown decking and outdoor sofas",
    intro:
      "Patio or decking is one of the first questions in any garden project. Neither is always better: the right one depends on your ground, how much upkeep you want and how you use the space.",
    blocks: [
      { type: "h2", text: "Patio: solid and long-lasting" },
      {
        type: "p",
        text: "Paving slabs and porcelain tiles on a proper base are very durable and suit level ground. They give a firm, even surface for furniture and are easy to sweep. Stone can get slippery when it grows algae in a shady, damp garden, so clean it and consider a textured finish.",
      },
      { type: "h2", text: "Decking: warm and good on slopes" },
      {
        type: "p",
        text: "Decking is raised on a frame, so it can level out a sloping garden and hide uneven ground. Timber looks and feels natural but needs regular treatment to last. Composite boards need less upkeep, but can get hot in strong sun and cost more at the start. Choose boards with a grooved or textured face for better grip when wet.",
      },
      { type: "h2", text: "How they compare" },
      {
        type: "ul",
        items: [
          "Upkeep: porcelain patios need the least, composite decking is low, timber decking needs the most.",
          "Slopes: decking copes with them more easily, patios need the ground levelled first.",
          "Grip: both can be slippery when wet and shady, so choose textured surfaces.",
          "Look: patios feel solid and formal, decking feels softer and more relaxed.",
        ],
      },
      { type: "h2", text: "Drainage and levels matter more than the material" },
      {
        type: "p",
        text: "Whichever you choose, the surface should slope slightly away from the house so water drains away, and it should usually sit at least 15 cm below the damp-proof course so that rain does not reach the wall. A good base and sound drainage are what stop patios sinking and decks rotting.",
      },
      { type: "h2", text: "Check the rules for raised decking" },
      {
        type: "p",
        text: "A raised deck is treated differently from a patio. In England, decking more than 30 cm above the ground usually needs planning permission, and a deck that overlooks neighbours can cause arguments even where it is allowed. Ask your local council if you are unsure.",
      },
      { type: "h2", text: "Why not both?" },
      {
        type: "p",
        text: "Many gardens work best with a mix: a paved area by the house for the table and chairs, and a decked area further back or at a different level for lounging. A mix also lets you use each material where it does best.",
      },
      { type: "h2", text: "Mistakes to avoid" },
      {
        type: "ul",
        items: [
          "Skipping the base: a thin base is the main reason patios settle and crack.",
          "Choosing dark composite for an area in full summer sun without thinking about heat.",
          "Forgetting drainage or the damp-proof course level.",
          "Ordering materials before measuring the space and the furniture.",
        ],
      },
      { type: "h2", text: "See your garden finished first" },
      {
        type: "p",
        text: "Upload a photo of your garden to GlowUpp and see AI-generated versions with a patio, decking or a mix of both, then share the one you like with a local landscaper for a quote. " + NOT_ADVICE,
      },
    ],
    faq: [
      {
        question: "Is decking or a patio better for a small garden?",
        answer: "Both work. A patio is simpler and lasts longer on level ground, while decking helps if the garden slopes. Choose a light colour and a simple shape to make a small space feel bigger.",
      },
      {
        question: "Do I need planning permission for decking?",
        answer: "In England, decking more than 30 cm above the ground usually needs planning permission. Check with your local council before you build.",
      },
      {
        question: "Which needs less maintenance, a patio or decking?",
        answer: "A porcelain or stone patio usually needs the least upkeep, followed by composite decking. Timber decking needs the most regular treatment.",
      },
    ],
    related: ["small-garden-ideas-uk-terrace", "front-door-exterior-colour-ideas"],
  },
  {
    slug: "show-clients-the-finished-job-first",
    audience: "professional",
    title: "How to win more quotes: show the client the finished job first",
    description: "Clients who cannot picture the result say they will think about it. How tradespeople can show the finished job before quoting, honestly and quickly.",
    published: "2026-10-27",
    category: "painting",
    heroSrc: "/homepage/flooring.jpg",
    heroAlt: "A worn, carpeted lounge next to the same space redesigned with oak flooring",
    intro:
      "A lot of quotes stall for one reason: the client cannot picture the finished job. They like you, they trust the price, and then they say they will think about it. Showing them the result first is one of the simplest ways to move that conversation on.",
    blocks: [
      { type: "h2", text: "Why quotes stall" },
      {
        type: "ul",
        items: [
          "The client is comparing a number on paper with a result they cannot see.",
          "They worry about spending a lot and regretting the choice.",
          "One partner can picture it and the other cannot, so the decision waits.",
          "A vague quote gives them nothing to hold on to while they decide.",
        ],
      },
      { type: "h2", text: "Ways to show the result" },
      {
        type: "ul",
        items: [
          "Photos of your own past jobs, sorted by type, so you can find a similar one in seconds.",
          "Samples and swatches for finishes, colours, tiles and flooring, left with the client.",
          "A simple sketch with measurements for layouts.",
          "A visualisation of their own room, such as an AI redesign made from a photo, to show colour, layout or finish.",
        ],
      },
      { type: "h2", text: "Do it at the first visit" },
      {
        type: "p",
        text: "With the client's permission, take a photo of the space while you are there and talk through one or two options with them: a colour, a layout, a material. Do not offer ten. Two or three choices keep the conversation easy, and the choice they make tells you what to put in the quote.",
      },
      { type: "h2", text: "Be honest about what a picture is" },
      {
        type: "p",
        text: "An AI image is an illustration to help the client imagine the result, not a plan or a guarantee. Say so. Confirm the measurements, the materials and what is possible on site, and put the details in a written, itemised quote. If you promise the picture and deliver something different, you will lose the trust you just built.",
      },
      { type: "h2", text: "Send it with the quote" },
      {
        type: "p",
        text: "Send the pictures together with the quote, so the client can look again and show their partner. A link or a QR code they can open on a phone is easier than attachments, and it keeps everything in one place.",
      },
      { type: "h2", text: "How GlowUpp can help" },
      {
        type: "p",
        text: `GlowUpp gives you a free profile and your own link and QR code. A client opens it, uploads a photo of their own space and sees AI-generated redesigns in a couple of minutes, then sends the design to you for an estimate. You send an itemised quote, and the client can accept it. For clients you bring yourself through your link, your first ${PRIVATE_LINK_FREE_JOBS} jobs are free, and after that GlowUpp charges ${FEE_PERCENT} of the accepted quote (capped at ${FEE_CAP}). For jobs from the open marketplace, you pay ${FEE_PERCENT} (capped at ${FEE_CAP}) only if the client picks you.`,
      },
      { type: "h2", text: "Mistakes to avoid" },
      {
        type: "ul",
        items: [
          "Overpromising: showing a result that the room or the budget cannot deliver.",
          "Offering too many options, which gives the client more to think about, not less.",
          "Sending a vague quote with a nice picture.",
          "Leaving it too long to follow up. A message within a day or two keeps the job fresh.",
        ],
      },
      { type: "h2", text: "A simple routine" },
      {
        type: "ul",
        items: [
          "Take a photo of the space (with permission) and note the measurements.",
          "Agree one or two options with the client.",
          "Send the pictures and an itemised written quote the same day.",
          "Follow up once, politely, within a couple of days.",
        ],
      },
    ],
    faq: [
      {
        question: "Do I need special software to show clients the result?",
        answer: "No. Photos of your past work and a few samples go a long way. A tool such as GlowUpp can also make a redesign of the client's own room from a phone photo.",
      },
      {
        question: "Is an AI image a binding design?",
        answer: "No. It is an illustration to help the client picture the result. The measurements, materials and details should be confirmed on site and written into your quote.",
      },
      {
        question: "How do I send a client a link or QR code?",
        answer: "With a GlowUpp profile you get your own link and QR code. Share the link by message or email, or show the QR code on your phone, your van or your printed quote.",
      },
    ],
    related: ["get-local-clients-without-paying-per-lead", "living-room-colour-ideas"],
  },
  {
    slug: "get-local-clients-without-paying-per-lead",
    audience: "professional",
    title: "How to get local clients without paying per lead",
    description: "Free and low-cost ways for tradespeople to get local clients: Google profile, reviews, referrals, local partners, your van and your photos.",
    published: "2026-10-27",
    category: "painting",
    heroSrc: "/homepage/painting.jpg",
    heroAlt: "A scuffed, bare wall next to the same room repainted in green",
    intro:
      "Paying for every lead adds up, especially when several tradespeople are competing for the same one. The good news is that most of what brings in steady local work is free or cheap and builds up over time.",
    blocks: [
      { type: "h2", text: "Start with a complete Google Business Profile" },
      {
        type: "p",
        text: "A free Google Business Profile helps you show up when people search for your trade in your area. Fill in every section: your trade and the areas you cover, opening hours, a phone number, a link, and as many photos of real jobs as you can. Keep it up to date.",
      },
      { type: "h2", text: "Ask for reviews, every time" },
      {
        type: "p",
        text: "Most happy customers will leave a review if you ask and make it easy. Ask while the job is fresh, and send a direct link by message so it takes them under a minute. Reply to every review, including the occasional bad one, calmly and politely.",
      },
      { type: "h2", text: "Turn happy clients into referrals" },
      {
        type: "ul",
        items: [
          "Ask each client whether they know someone else who needs similar work.",
          "Thank them properly. A message or a small gesture goes a long way.",
          "Neighbours on the same street often notice a job in progress and ask who is doing it.",
        ],
      },
      { type: "h2", text: "Build local partnerships" },
      {
        type: "p",
        text: "Other trades, builders' merchants, estate and letting agents, interior designers and local shops all meet people who are about to start a project. A plumber, a tiler and a decorator can pass work to each other. Leave a card or a poster with a clear link or QR code, and keep your promises so they are happy to recommend you.",
      },
      { type: "h2", text: "Be visible where you work" },
      {
        type: "ul",
        items: [
          "A clean, clearly marked van with your name, trade and one way to contact you.",
          "A job board outside the property, if the client agrees and local rules allow it.",
          "A short, tidy social profile with before and after photos of recent work.",
        ],
      },
      { type: "h2", text: "Join local groups the right way" },
      {
        type: "p",
        text: "Local community and neighbourhood groups are full of people asking for recommendations. Read the group's rules first, be useful by answering questions and sharing photos of real jobs, and do not post the same advert everywhere. Most groups remove repeated adverts.",
      },
      { type: "h2", text: "Show your work with permission" },
      {
        type: "p",
        text: "Before and after photos are the strongest thing you can show. Ask the client before you share pictures of their home, keep a folder sorted by job type so you can find a similar one quickly, and use the same photos on your profile and your social pages.",
      },
      { type: "h2", text: "Make it easy to contact you" },
      {
        type: "p",
        text: "Put your phone number, a WhatsApp or message link and one clear web link or QR code everywhere. Reply to enquiries quickly. A prompt, polite reply often wins the job before anyone else has answered.",
      },
      { type: "h2", text: "Where GlowUpp fits" },
      {
        type: "p",
        text: `GlowUpp is free to join and a profile costs nothing. You get your own link and QR code to share with clients you find yourself; your first ${PRIVATE_LINK_FREE_JOBS} jobs from those clients are free, and after that GlowUpp charges ${FEE_PERCENT} of the accepted quote (capped at ${FEE_CAP}). For jobs from the open marketplace, you pay ${FEE_PERCENT} (capped at ${FEE_CAP}) only if the client picks you. It is not free forever, but you never pay for a lead you do not win.`,
      },
      { type: "h2", text: "Keep track of what works" },
      {
        type: "p",
        text: "Ask every new client how they found you and write it down. After a couple of months you will see which of these is worth your time and which to drop, so you can put your effort where the work comes from.",
      },
      { type: "h2", text: "Mistakes to avoid" },
      {
        type: "ul",
        items: [
          "Spreading yourself across too many places and doing none of them well.",
          "A profile with no photos of real work.",
          "Never asking for reviews.",
          "Leaving enquiries unanswered for days.",
        ],
      },
    ],
    faq: [
      {
        question: "Is it free to join GlowUpp as a tradesperson?",
        answer: `Yes. A profile is free. You pay ${FEE_PERCENT} of the accepted quote (capped at ${FEE_CAP}) only when a client picks you through the marketplace, and your first ${PRIVATE_LINK_FREE_JOBS} jobs from your own clients through your private link are free before the same percentage applies.`,
      },
      {
        question: "How do I get more Google reviews?",
        answer: "Ask every happy client soon after the job, and send them a direct link so leaving a review takes under a minute. Reply to every review politely.",
      },
      {
        question: "Do I need a website to get local work?",
        answer: "Not necessarily. A complete Google Business Profile, a tidy social page with photos and one clear link or QR code are enough for many tradespeople to start.",
      },
    ],
    related: ["show-clients-the-finished-job-first", "kitchen-ideas-small-terraced-house"],
  },
  {
    slug: "how-to-set-a-realistic-renovation-budget",
    title: "How to set a realistic renovation budget (and why you need a contingency)",
    description: "A step-by-step way to set a renovation budget you can stick to, including what people forget to include and how big a contingency to hold back.",
    published: "2026-10-27",
    category: "extension",
    heroSrc: "/homepage/extension.jpg",
    heroAlt: "The plain back of a brick house next to the same house with a new glazed extension",
    intro:
      "Most renovations that go over budget do so for the same reasons: the plan was vague, some costs were forgotten and nothing was held back for surprises. A little work at the start makes the number much easier to hold.",
    blocks: [
      { type: "h2", text: "Start with what you want, in order" },
      {
        type: "p",
        text: "Write a list of everything you would like to do and sort it into three groups: must do, should do and nice to have. If the money runs short, you will cut from the bottom, not from the things that matter.",
      },
      { type: "h2", text: "Get real quotes before you fix the number" },
      {
        type: "p",
        text: "Online guides can tell you what is possible, but only quotes for your own house tell you what it will cost. Get itemised quotes for the work, and treat any figure from a conversation or a website as a rough guide until it is in writing.",
      },
      { type: "h2", text: "Remember the costs that are easy to forget" },
      {
        type: "ul",
        items: [
          "VAT, if the quotes do not include it.",
          "Design, survey or building-control fees, and any permissions you need.",
          "Skip hire, waste removal and protecting floors and furniture.",
          "Decorating and making good after other trades have finished.",
          "Furniture, lighting, curtains and appliances.",
          "Somewhere to live or cook if the work makes the house hard to use.",
        ],
      },
      { type: "h2", text: "Hold back a contingency" },
      {
        type: "p",
        text: "Older houses hide problems behind walls and under floors, and projects change as you go. Many people set aside around 10 to 20% of the budget for the unexpected, and more for an older house or a larger structural job. Keep it separate and do not spend it on upgrades at the start.",
      },
      { type: "h2", text: "Agree how you will pay" },
      {
        type: "p",
        text: "Ask for payments that follow the stages of the work, so you are never far ahead of what has been done. Put it in writing, and keep a simple record of what you have agreed, paid and still owe.",
      },
      { type: "h2", text: "Track it as you go" },
      {
        type: "p",
        text: "A simple spreadsheet with the quote, extras agreed and payments made keeps surprises small. Ask for any change in price to be agreed in writing before the work is done, not afterwards.",
      },
      { type: "h2", text: "Mistakes to avoid" },
      {
        type: "ul",
        items: [
          "Fixing a budget before you have any quotes.",
          "Choosing the cheapest quote without checking what is left out of it.",
          "Spending the contingency on upgrades in the first week.",
          "Agreeing extra work by word of mouth.",
        ],
      },
      { type: "h2", text: "Picture the result before you price it" },
      {
        type: "p",
        text: "Upload a photo of your home to GlowUpp and see AI-generated ideas before you ask for quotes, so you can brief tradespeople clearly. A clear brief makes quotes easier to compare. " + NOT_ADVICE,
      },
    ],
    faq: [
      {
        question: "How much contingency should I allow for a renovation?",
        answer: "Many people hold back around 10 to 20% of the budget, and more for an older property or a larger structural job. The right amount depends on how much is unknown.",
      },
      {
        question: "What do people forget to budget for?",
        answer: "VAT, fees and permissions, skip hire, decorating after the building work, furniture and appliances, and the cost of living with the disruption.",
      },
      {
        question: "Should I pay a deposit before the work starts?",
        answer: "Agree a payment plan in writing that follows the stages of the work, so you never pay far ahead of what has been done. Be cautious about large payments up front.",
      },
    ],
    related: ["what-order-to-renovate-a-house", "compare-builders-quotes-like-for-like"],
  },
  {
    slug: "what-order-to-renovate-a-house",
    title: "What order should you renovate a house in?",
    description: "The usual order for renovation work, from planning and structure to decorating, and why doing things out of order costs time and money.",
    published: "2026-10-27",
    category: "roofing",
    heroSrc: "/homepage/roofing.jpg",
    heroAlt: "An old moss-covered tiled roof next to the same building with a new slate roof",
    intro:
      "Doing jobs in the wrong order is one of the most expensive renovation mistakes: you decorate and then someone cuts into the wall, or you lay a new floor and then the plumber lifts it. A sensible order protects everything you have paid for.",
    blocks: [
      { type: "h2", text: "1. Plan, survey and get permissions" },
      {
        type: "p",
        text: "Decide what you want, get a survey if the house is old or you are changing the structure, and find out whether you need planning permission or building regulations approval. Ask your local council or a professional rather than assuming.",
      },
      { type: "h2", text: "2. Make the house weathertight and sound" },
      {
        type: "p",
        text: "Roof, gutters, damp, rotten timber and structural problems come first. Everything inside is at risk while water is getting in, and it is wasteful to finish a room that will be damaged later.",
      },
      { type: "h2", text: "3. Structural changes and building work" },
      {
        type: "p",
        text: "Knocking through walls, extensions and new openings come next, while the house is still bare. This is also the time to make any changes to the layout.",
      },
      { type: "h2", text: "4. First fix: pipes, wires and heating" },
      {
        type: "p",
        text: "Plumbing, electrics and heating are run before the walls and ceilings are closed. Gas work must be done by a Gas Safe registered engineer, and electrical work by someone competent and, ideally, registered with a recognised scheme. Ask what certificates you will receive.",
      },
      { type: "h2", text: "5. Insulation, plastering and drying out" },
      {
        type: "p",
        text: "Once the services are in, walls and ceilings are insulated and plastered. Fresh plaster needs time to dry before it is painted, so do not rush this stage.",
      },
      { type: "h2", text: "6. Second fix: fittings and finishing" },
      {
        type: "p",
        text: "Kitchens, bathrooms, sockets, switches, radiators and doors go in at this stage, usually before the final decorating so that the decorator can make good as they go.",
      },
      { type: "h2", text: "7. Floors and decorating last" },
      {
        type: "p",
        text: "Floor coverings and painting go last, once the messy trades have finished. Protect any new flooring while the other work is completed, and keep furniture out until everything is dry and finished.",
      },
      { type: "h2", text: "Mistakes to avoid" },
      {
        type: "ul",
        items: [
          "Decorating before the wiring and plumbing are finished.",
          "Fitting a beautiful new kitchen before the damp problem is fixed.",
          "Ordering expensive finishes long before they are needed.",
          "Not telling the trades about each other, so they get in each other's way.",
        ],
      },
      { type: "h2", text: "Plan the finish first" },
      {
        type: "p",
        text: "Seeing the finished result early helps you plan the order. Upload a photo to GlowUpp to see AI-generated ideas, then talk the sequence through with your builder. " + NOT_ADVICE,
      },
    ],
    faq: [
      {
        question: "What should I do first when renovating a house?",
        answer: "Plan, survey and check what permissions you need, then fix anything that lets water in or affects the structure before you work on the inside.",
      },
      {
        question: "Should I decorate before or after the kitchen and bathroom are fitted?",
        answer: "Usually after the messy work and fittings are in, so your decorating is not damaged. Ask your decorator to plan the order with the other trades.",
      },
      {
        question: "Who can do gas and electrical work?",
        answer: "Gas work must be done by a Gas Safe registered engineer. Electrical work should be done by a competent electrician, ideally registered with a recognised scheme, who can give you the right certificates.",
      },
    ],
    related: ["how-to-set-a-realistic-renovation-budget", "red-flags-in-a-quote"],
  },
  {
    slug: "get-three-quotes-from-tradespeople",
    title: "How to get three quotes from tradespeople without the hassle",
    description: "How to ask for quotes so you get comparable answers quickly: a clear brief, the same details for everyone, and what to do when you have decided.",
    published: "2026-10-27",
    category: "driveway",
    heroSrc: "/homepage/driveway.jpg",
    heroAlt: "A cracked, weedy driveway next to a new block-paved driveway",
    intro:
      "Getting several quotes is good advice, but chasing tradespeople and comparing vague answers is a hassle. If you give everyone the same clear information, you will get comparable quotes with much less effort.",
    blocks: [
      { type: "h2", text: "Write a short brief" },
      {
        type: "p",
        text: "Put together a one-page description: what you want done, the measurements if you have them, photos of the space, any finishes you have chosen and when you would like the work done. The clearer you are, the more accurate the quotes will be.",
      },
      { type: "h2", text: "Show them what you want" },
      {
        type: "p",
        text: "Pictures save a lot of explaining. Photos of the current space and a few ideas or an AI redesign of your own photo show a tradesperson what you have in mind far better than words alone.",
      },
      { type: "h2", text: "Ask everyone the same questions" },
      {
        type: "ul",
        items: [
          "Can they visit before quoting, or only give a rough guide from photos?",
          "How soon could they start, and how long will it take?",
          "Is the quote itemised, and does it include materials, waste removal and VAT?",
          "Are they insured, and who will actually do the work?",
        ],
      },
      { type: "h2", text: "Three is a good number" },
      {
        type: "p",
        text: "Three quotes is a sensible rule of thumb: enough to see the range without taking over your life. Ask for them at the same time and set a date by which you will decide.",
      },
      { type: "h2", text: "Be fair to the tradespeople" },
      {
        type: "p",
        text: "Quoting takes time. Respond promptly, keep appointments and tell the others politely when you have chosen someone. People remember good customers, and you may want to call them again.",
      },
      { type: "h2", text: "Compare them in one place" },
      {
        type: "p",
        text: "Put the quotes side by side in a simple table: what is included, what is not, the price, the start date and the payment plan. A great price that leaves out half the work is not cheaper.",
      },
      { type: "h2", text: "Mistakes to avoid" },
      {
        type: "ul",
        items: [
          "Giving each tradesperson a slightly different description.",
          "Choosing on price alone.",
          "Taking a quote without a visit for work that needs measuring.",
          "Leaving people waiting for an answer for weeks.",
        ],
      },
      { type: "h2", text: "Send one brief to local professionals" },
      {
        type: "p",
        text: "With GlowUpp you can upload a photo, choose a design you like and share it with local professionals so they can send you quotes for the same job. It is free for homeowners. " + NOT_ADVICE,
      },
    ],
    faq: [
      {
        question: "How many quotes should I get for building work?",
        answer: "Three is a sensible rule of thumb: enough to see the range without taking over your life. Give each the same brief so the quotes can be compared.",
      },
      {
        question: "Should I always accept the cheapest quote?",
        answer: "Not automatically. Check what is included and what is left out, and compare insurance, experience and the payment plan as well as the price.",
      },
      {
        question: "What should I include in a brief?",
        answer: "What you want done, measurements if you have them, photos, finishes you have chosen and the timing you would like.",
      },
    ],
    related: ["compare-builders-quotes-like-for-like", "red-flags-in-a-quote"],
  },
  {
    slug: "compare-builders-quotes-like-for-like",
    title: "How to compare builders' quotes like for like",
    description: "How to compare quotes properly: what is included, what is left out, who buys the materials, VAT, timing and payments.",
    published: "2026-10-27",
    category: "bedroom",
    heroSrc: "/homepage/bedroom.jpg",
    heroAlt: "A dark traditional bedroom next to the same room redesigned in soft, light colours",
    intro:
      "Two quotes for the same job can differ by a lot, and the cheaper one is not always cheaper once you see what is missing. Comparing like for like means looking past the total at what each quote actually covers.",
    blocks: [
      { type: "h2", text: "Check the scope of work" },
      {
        type: "p",
        text: "Read what each quote says it will do. Does it include removing the old fittings, preparing the walls, fitting, finishing and clearing away? If one quote is vague, ask for a written list.",
      },
      { type: "h2", text: "Who supplies the materials?" },
      {
        type: "p",
        text: "Find out whether materials are included, and what quality or brand has been assumed. If one quote assumes a basic product and another a premium one, the totals are not comparable. Ask each to price the same specification.",
      },
      { type: "h2", text: "Watch for provisional sums" },
      {
        type: "p",
        text: "A provisional sum is a placeholder for something not yet decided, such as tiles or a kitchen. It can grow later. Ask how much each is and what happens if the final cost is different.",
      },
      { type: "h2", text: "VAT, waste and making good" },
      {
        type: "ul",
        items: [
          "Is VAT included, or is it added on top?",
          "Who removes the rubbish and pays for the skip?",
          "Who repairs and decorates after the work? Plastering and painting are often not included.",
        ],
      },
      { type: "h2", text: "Timing and payments" },
      {
        type: "p",
        text: "Compare the start date, the time it will take and the payment schedule. A quote with payments tied to stages of the work is safer than one asking for a large amount at the start.",
      },
      { type: "h2", text: "Insurance and guarantees" },
      {
        type: "p",
        text: "Ask each tradesperson about their insurance and whether the work comes with a guarantee or warranty. Get anything promised in writing.",
      },
      { type: "h2", text: "Put them side by side" },
      {
        type: "ul",
        items: [
          "One column per quote and one row for each item above.",
          "Highlight anything missing or unclear and ask about it.",
          "Ask for a revised quote if you change the specification.",
        ],
      },
      { type: "h2", text: "Mistakes to avoid" },
      {
        type: "ul",
        items: [
          "Comparing only the total at the bottom.",
          "Assuming everyone has quoted for the same materials.",
          "Missing exclusions in the small print.",
        ],
      },
      { type: "h2", text: "Brief everyone the same way" },
      {
        type: "p",
        text: "Share the same photo and design ideas with each tradesperson so they quote for the same thing. GlowUpp lets you share one design with local professionals. " + NOT_ADVICE,
      },
    ],
    faq: [
      {
        question: "Why are two quotes for the same job so different?",
        answer: "They may include different materials, scope, waste removal or finishing, or one may leave out items the other includes. Compare what is covered, not just the total.",
      },
      {
        question: "What is a provisional sum?",
        answer: "A placeholder amount for something not yet chosen or measured, such as tiles or fittings. The final cost may be higher or lower, so ask how any difference is handled.",
      },
      {
        question: "Should payments be tied to the stages of work?",
        answer: "Generally yes. Staged payments mean you never pay far ahead of what has been completed. Agree the plan in writing.",
      },
    ],
    related: ["get-three-quotes-from-tradespeople", "what-a-good-written-quote-includes"],
  },
  {
    slug: "questions-to-ask-a-tradesperson-before-you-hire",
    title: "10 questions to ask a tradesperson before you hire them",
    description: "Ten practical questions to ask before you hire a tradesperson: insurance, registration, who does the work, payment, guarantees and what happens if something goes wrong.",
    published: "2026-10-27",
    category: "bathroom",
    heroSrc: "/homepage/bathroom.jpg",
    heroAlt: "A tired small bathroom next to an AI redesign with green tiles and a glass shower screen",
    intro:
      "A few good questions before you hire someone can save you a lot of trouble. A professional will not mind being asked; if someone gets annoyed by sensible questions, that is useful to know too.",
    blocks: [
      { type: "h2", text: "The ten questions" },
      {
        type: "ul",
        items: [
          "Are you insured, and can I see the certificate? Look for public liability insurance that covers your type of work.",
          "Are you registered for this work? Gas work needs a Gas Safe registered engineer, and electricians can belong to recognised schemes.",
          "Can I see similar recent jobs, or speak to a past client?",
          "Who will actually do the work: you, your employees or subcontractors?",
          "When can you start, and how long will it take?",
          "Is your quote itemised, and what is not included?",
          "How and when do I pay? Can payments be tied to stages of the work?",
          "What happens if you find something unexpected, and how will extra costs be agreed?",
          "Do you give a guarantee or warranty, and what does it cover?",
          "Who handles waste, tidying up and any permissions or certificates?",
        ],
      },
      { type: "h2", text: "What good answers look like" },
      {
        type: "p",
        text: "Good tradespeople answer clearly, give you things in writing and are happy to be checked. Vague answers, pressure to decide quickly or reluctance to show insurance or past work are reasons to slow down.",
      },
      { type: "h2", text: "Write the answers down" },
      {
        type: "p",
        text: "Keep a note of what was said, and ask for anything important to be added to the written quote. It protects both of you if there is a disagreement later.",
      },
      { type: "h2", text: "Check what they tell you" },
      {
        type: "p",
        text: "Check the registration and insurance rather than taking them on trust, and look at reviews in more than one place. Our guide to checking a tradesperson explains how.",
      },
      { type: "h2", text: "Find professionals who show their work" },
      {
        type: "p",
        text: "On GlowUpp you can share your design with local professionals and see who responds with a quote. You choose who to talk to and who to hire. " + NOT_ADVICE,
      },
    ],
    faq: [
      {
        question: "What insurance should a tradesperson have?",
        answer: "Public liability insurance that covers the work they will do is the usual minimum. Ask to see the certificate and check the dates and the type of cover.",
      },
      {
        question: "Should I check who will do the work?",
        answer: "Yes. Ask whether the person quoting will do the job themselves, or whether employees or subcontractors will, and who is responsible for the quality.",
      },
      {
        question: "Is it normal to ask for references?",
        answer: "Yes. Good tradespeople are happy to show similar recent work and put you in touch with a past client.",
      },
    ],
    related: ["check-a-tradespersons-insurance-reviews-and-past-work", "red-flags-in-a-quote"],
  },
  {
    slug: "red-flags-in-a-quote",
    title: "Red flags in a quote: what to watch for",
    description: "Warning signs in a tradesperson's quote or sales pitch: vague prices, pressure to decide, large upfront payments, cash-only deals and more.",
    published: "2026-10-27",
    category: "exterior",
    heroSrc: "/homepage/exterior.jpg",
    heroAlt: "A tired grey house front next to an AI redesign with white render and a navy front door",
    intro:
      "Most tradespeople are honest and good at their jobs, but a few quotes should make you stop and think. These warning signs do not prove anything on their own, but several together are a reason to look elsewhere.",
    blocks: [
      { type: "h2", text: "The quote itself" },
      {
        type: "ul",
        items: [
          "A single total with no breakdown, or only a handful of words describing the job.",
          "No company name, address or contact details, only a mobile number.",
          "Large amounts marked as provisional, or materials left as an open-ended extra.",
          "A price far below everyone else's with no clear reason.",
        ],
      },
      { type: "h2", text: "The sales style" },
      {
        type: "ul",
        items: [
          "Pressure to decide today, or a special price that disappears if you wait.",
          "A cold call or a knock on the door claiming they spotted a problem with your roof or driveway.",
          "Refusing to put things in writing.",
        ],
      },
      { type: "h2", text: "Money and paperwork" },
      {
        type: "ul",
        items: [
          "A large payment up front, or payment in cash with no receipt.",
          "No mention of insurance, or reluctance to show a certificate.",
          "No guarantee or no clear answer about what happens if something goes wrong.",
        ],
      },
      { type: "h2", text: "What to do" },
      {
        type: "p",
        text: "Slow down, ask questions and get the answers in writing. Check registration and insurance, look for reviews in several places and compare with other quotes. If something feels wrong, you can walk away.",
      },
      { type: "h2", text: "Know your rights" },
      {
        type: "p",
        text: "If you agree to work at your home, you may have a legal right to cancel within a set number of days, but this can be lost if you ask for work to start sooner. Check the rules on Citizens Advice before you sign.",
      },
      { type: "h2", text: "Good signs to look for" },
      {
        type: "ul",
        items: [
          "An itemised, written quote with a business name and address.",
          "Clear answers about insurance, registration and who does the work.",
          "A payment plan tied to stages of the work.",
          "Past clients and recent work they are happy to show.",
        ],
      },
      { type: "h2", text: "Compare before you commit" },
      {
        type: "p",
        text: "Getting several quotes for the same brief makes unusual ones easier to spot. Upload a photo to GlowUpp and share your design with local professionals to compare quotes in one place. " + NOT_ADVICE,
      },
    ],
    faq: [
      {
        question: "Is a very low quote always a red flag?",
        answer: "Not always, but it is worth asking why it is so much lower. It may leave out work or materials, or assume lower quality. Compare what is included.",
      },
      {
        question: "Should I pay in cash?",
        answer: "Be cautious. A payment with no paperwork leaves you with little protection if something goes wrong. Ask for an invoice and a receipt, and agree the payment plan in writing.",
      },
      {
        question: "What should I do about a cold caller offering work?",
        answer: "Do not feel pressured to agree on the spot. Ask for their details in writing, check them and get other quotes before you decide.",
      },
    ],
    related: ["questions-to-ask-a-tradesperson-before-you-hire", "what-a-good-written-quote-includes"],
  },
  {
    slug: "check-a-tradespersons-insurance-reviews-and-past-work",
    title: "How to check a tradesperson's insurance, reviews and past work",
    description: "A practical checklist for checking a tradesperson before you hire them: insurance, registration, company details, reviews and examples of past work.",
    published: "2026-10-27",
    category: "garden",
    heroSrc: "/homepage/garden.jpg",
    heroAlt: "A bare terrace back garden next to an AI redesign with lawn, path and planting",
    intro:
      "Checking a tradesperson takes about half an hour and can save you from a lot of trouble. You are looking for evidence that they are who they say they are, insured, qualified for the work and that other customers are happy.",
    blocks: [
      { type: "h2", text: "1. Insurance" },
      {
        type: "p",
        text: "Ask for a copy of their insurance certificate. Check that it is in date, that it is public liability cover (and any other cover relevant to your job) and that it covers the type of work they will do. If anything is unclear, contact the insurer.",
      },
      { type: "h2", text: "2. Registration for regulated work" },
      {
        type: "ul",
        items: [
          "Gas work: the engineer must be on the Gas Safe Register, which you can check online.",
          "Electrical work: ask whether they belong to a recognised competent-person scheme and what certificates you will get.",
          "Some other trades have trade bodies or schemes (such as TrustMark) that you can check. Ask what applies.",
        ],
      },
      { type: "h2", text: "3. Company details" },
      {
        type: "p",
        text: "If they trade as a limited company, you can look it up on Companies House to check that it exists, its registered address and whether it is still active. A real, stable business is usually easier to deal with if there is a problem.",
      },
      { type: "h2", text: "4. Reviews" },
      {
        type: "p",
        text: "Look at reviews in more than one place and read the detailed ones, not just the star rating. Look at how they respond to complaints. A few bad reviews handled well are a better sign than none at all with no history.",
      },
      { type: "h2", text: "5. Past work" },
      {
        type: "p",
        text: "Ask to see recent, similar jobs and, if you can, speak to a past client or visit a finished job. Check that the photos are theirs and that the style of work is what you want.",
      },
      { type: "h2", text: "6. Guarantees" },
      {
        type: "p",
        text: "Ask what guarantee or warranty is given and what it covers. Keep it in writing, along with any certificates, invoices and receipts.",
      },
      { type: "h2", text: "A simple checklist" },
      {
        type: "ul",
        items: [
          "Insurance certificate seen and in date.",
          "Registration checked for gas and electrical work.",
          "Business details checked.",
          "Reviews read in more than one place.",
          "Recent similar work seen.",
          "Guarantee and payment plan in writing.",
        ],
      },
      { type: "h2", text: "Choose from professionals who show their work" },
      {
        type: "p",
        text: "On GlowUpp you can look at the professionals who respond to your design and decide who to talk to. Always do your own checks before you hire. " + NOT_ADVICE,
      },
    ],
    faq: [
      {
        question: "How do I check a Gas Safe registered engineer?",
        answer: "Use the Gas Safe Register's online check, which lets you search by name or registration number and see what types of work the engineer is qualified for.",
      },
      {
        question: "Can I check a company online?",
        answer: "Yes. Companies House is a free register where you can look up a limited company's registered address, status and filing history.",
      },
      {
        question: "Are online reviews enough?",
        answer: "They help, but look at more than one source, read the detail and combine them with insurance, registration and a look at past work.",
      },
    ],
    related: ["questions-to-ask-a-tradesperson-before-you-hire", "red-flags-in-a-quote"],
  },
  {
    slug: "what-a-good-written-quote-includes",
    title: "What a good written quote should include",
    description: "What to expect in a proper written quote: business details, a clear description of the work, itemised costs, VAT, timing, payments and what happens to changes.",
    published: "2026-10-27",
    category: "kitchen",
    heroSrc: "/homepage/kitchen.jpg",
    heroAlt: "A dated small kitchen next to an AI redesign of the same room with navy units",
    intro:
      "A good written quote protects both you and the tradesperson. It makes clear what is being done, for how much and when, so there are fewer arguments and surprises later.",
    blocks: [
      { type: "h2", text: "A good quote includes" },
      {
        type: "ul",
        items: [
          "The business name, address, phone number and email, plus the date and how long the quote is valid.",
          "Your name and the address of the job.",
          "A clear description of the work, step by step, with the materials and finishes agreed.",
          "An itemised price: labour and materials listed separately, not just one total.",
          "What is not included, such as decorating, rubbish removal or extra tiles.",
          "Whether VAT is included.",
          "The start date and how long the work should take.",
          "The payment plan: how much, when and for what stage.",
          "How changes will be handled: any extra work agreed and priced in writing first.",
          "Insurance details and any guarantee that comes with the work.",
        ],
      },
      { type: "h2", text: "Why itemising matters" },
      {
        type: "p",
        text: "A breakdown lets you see where the money goes and compare quotes. It also lets you change one part of the job without having to start again.",
      },
      { type: "h2", text: "Check it matches what you discussed" },
      {
        type: "p",
        text: "Read the quote carefully against your brief. If something you talked about is missing, or something unexpected is there, ask before you accept. Ask for changes to be written in.",
      },
      { type: "h2", text: "Accepting a quote" },
      {
        type: "p",
        text: "Accept in writing, keep a copy and make sure the quote and any agreed changes stay together. A message or email is better than a conversation if there is ever a disagreement.",
      },
      { type: "h2", text: "Mistakes to avoid" },
      {
        type: "ul",
        items: [
          "Accepting a quote that is only a total.",
          "Agreeing extras without a price.",
          "Paying more than the plan says without being sure the work is done.",
        ],
      },
      { type: "h2", text: "Quotes you can compare" },
      {
        type: "p",
        text: "On GlowUpp, tradespeople send itemised quotes against the design you shared, so you can compare them in one place. It is free for homeowners. " + NOT_ADVICE,
      },
    ],
    faq: [
      {
        question: "Should a quote be itemised?",
        answer: "Yes, it is much easier to understand and compare. It should list labour and materials and make clear what is and is not included.",
      },
      {
        question: "What if the price changes during the work?",
        answer: "Agree any change in price in writing before the extra work is done. Keep a copy with the original quote.",
      },
      {
        question: "How long is a quote valid for?",
        answer: "It varies, and a good quote states a date. Material prices and availability can change, so do not assume an old quote still applies.",
      },
    ],
    related: ["compare-builders-quotes-like-for-like", "send-a-quote-clients-say-yes-to"],
  },
  {
    slug: "price-a-job-without-undercutting-yourself",
    audience: "professional",
    title: "How to price a job without undercutting yourself",
    description: "A simple way for tradespeople to price jobs fairly: know your real costs, work out your day rate, allow for risk and stop competing on price alone.",
    published: "2026-10-27",
    category: "painting",
    heroSrc: "/homepage/extension.jpg",
    heroAlt: "The plain back of a brick house next to the same house with a new glazed extension",
    intro:
      "Many tradespeople underprice because they compare themselves with the cheapest quote they hear about. The result is a busy diary and a thin profit. Pricing well starts with knowing what you actually need to earn.",
    blocks: [
      { type: "h2", text: "Know your real costs" },
      {
        type: "p",
        text: "Add up what it costs to run your business for a year: the van and fuel, insurance, tools and repairs, phone, software, accountant, training, and tax. Many people forget the time spent quoting, travelling, buying materials and doing paperwork, none of which is billed directly.",
      },
      { type: "h2", text: "Work out the day rate you need" },
      {
        type: "p",
        text: "Decide what you want to take home, add your running costs and tax, and divide by the number of days you can realistically bill, not the number of days in the year. Allow for holidays, sickness, bad weather and gaps between jobs. That gives you a minimum day rate to price from.",
      },
      { type: "h2", text: "Price the job, not just the day" },
      {
        type: "ul",
        items: [
          "Estimate the days of work honestly, including preparation and clearing up.",
          "Price materials at cost plus a sensible handling margin, and say how you charge for them.",
          "Allow for risk: access, older properties, hidden problems and awkward clients.",
          "Put your price in an itemised quote so clients see the value.",
        ],
      },
      { type: "h2", text: "Do not compete only on price" },
      {
        type: "p",
        text: "There is always someone cheaper. Clients also pay for reliability, tidy work, clear communication and being able to see the result before they commit. Show recent work and reviews, and help the client picture the finished job.",
      },
      { type: "h2", text: "Say no sometimes" },
      {
        type: "p",
        text: "Some jobs are not worth taking at the price a client wants to pay. Turning one down politely leaves space for a better one, and can lead to the client coming back.",
      },
      { type: "h2", text: "Review your prices regularly" },
      {
        type: "p",
        text: "Costs change. Review your rate at least once a year, raise prices gradually, and track how many quotes you win. If you win nearly every quote, you are probably too cheap.",
      },
      { type: "h2", text: "Mistakes to avoid" },
      {
        type: "ul",
        items: [
          "Pricing by guessing what the client will accept.",
          "Forgetting unbilled time and tax.",
          "Giving a total with no breakdown, so the client sees only the number.",
          "Starting without agreeing how changes will be charged.",
        ],
      },
      { type: "h2", text: "Fees on lead sites and GlowUpp" },
      {
        type: "p",
        text: `Remember to count what you pay to find work. With GlowUpp, a profile is free. For jobs from clients who come through your own link, your first ${PRIVATE_LINK_FREE_JOBS} are free and after that GlowUpp charges ${FEE_PERCENT} of the accepted quote (capped at ${FEE_CAP}). For marketplace jobs, you pay ${FEE_PERCENT} (capped at ${FEE_CAP}) only if the client picks you. Allow for it in your price so it does not come out of your profit.`,
      },
    ],
    faq: [
      {
        question: "How do I work out my day rate?",
        answer: "Add the income you want to take home to your running costs and tax, then divide by the number of days you can realistically bill, allowing for holidays, sickness, weather and gaps between jobs.",
      },
      {
        question: "Should I include materials in my price?",
        answer: "Either is fine as long as it is clear. State how you charge for materials, itemise them in the quote and say how any change will be handled.",
      },
      {
        question: "How do I know if I am too cheap?",
        answer: "If you win almost every quote, or you are busy but have little left after costs and tax, your prices may be too low. Track your win rate and profit.",
      },
    ],
    related: ["send-a-quote-clients-say-yes-to", "show-clients-the-finished-job-first"],
  },
  {
    slug: "send-a-quote-clients-say-yes-to",
    audience: "professional",
    title: "How to send a quote clients say yes to",
    description: "How tradespeople can send quotes that get accepted: reply fast, be clear and itemised, show the result, give a deadline and follow up once.",
    published: "2026-10-27",
    category: "painting",
    heroSrc: "/homepage/hero.jpg",
    heroAlt: "A dated kitchen next to an AI redesign of the same room with navy units",
    intro:
      "The quote itself is only part of it. What decides whether a client says yes is how fast you reply, how clear the quote is and whether they can picture the result. These steps make a quote easier to accept.",
    blocks: [
      { type: "h2", text: "Reply quickly" },
      {
        type: "p",
        text: "A prompt, polite reply often wins the job before anyone else has answered. If you cannot send the full quote yet, tell the client when they will have it.",
      },
      { type: "h2", text: "Visit before you quote, where it matters" },
      {
        type: "p",
        text: "For jobs that need measuring or have unknowns, a visit lets you give an accurate price and shows the client you take it seriously. Take photos and notes while you are there.",
      },
      { type: "h2", text: "Be clear and itemised" },
      {
        type: "ul",
        items: [
          "Describe the work in plain English, step by step.",
          "List labour and materials, and say what is not included.",
          "State the start date, how long it will take and the payment plan.",
          "Say how changes will be handled, and how long the quote is valid.",
        ],
      },
      { type: "h2", text: "Show the result" },
      {
        type: "p",
        text: "Include photos of similar work, or a visualisation of the client's own space, so they can see what they are paying for. Remember that a picture is an illustration, not a promise, and write the specification into the quote.",
      },
      { type: "h2", text: "Make the next step easy" },
      {
        type: "p",
        text: "Tell the client exactly how to accept: a reply, a signature or a button. Offer a clear date to decide by, and, if it suits the job, two options at different prices instead of one.",
      },
      { type: "h2", text: "Follow up once" },
      {
        type: "p",
        text: "If you have not heard back in a couple of days, send a short, friendly message asking whether they have any questions. Do not chase repeatedly. If they say no, thank them and ask what swayed them.",
      },
      { type: "h2", text: "Mistakes to avoid" },
      {
        type: "ul",
        items: [
          "A one-line total with no detail.",
          "Taking days to reply.",
          "Offering too many options.",
          "Sending a quote and never following up.",
        ],
      },
      { type: "h2", text: "Sending quotes with GlowUpp" },
      {
        type: "p",
        text: "With GlowUpp, a client shares their design with you, and you send an itemised quote with your price and timeline from your dashboard. The client can accept it in the same place. Read our guide on showing clients the finished job first for more.",
      },
    ],
    faq: [
      {
        question: "How quickly should I reply to an enquiry?",
        answer: "As soon as you reasonably can. A quick, polite reply, even to say when the full quote will follow, often decides who gets the job.",
      },
      {
        question: "Should I offer more than one option?",
        answer: "Two or three clear options can help, but too many make the decision harder. Keep each one simple and itemised.",
      },
      {
        question: "How many times should I follow up on a quote?",
        answer: "Once, after a couple of days, with a short and friendly message. Repeated chasing usually does more harm than good.",
      },
    ],
    related: ["price-a-job-without-undercutting-yourself", "what-a-good-written-quote-includes"],
  },
  {
    slug: "pay-per-lead-monthly-fee-or-commission",
    audience: "professional",
    title: "Pay per lead, monthly fee or commission? How to compare lead costs",
    description: "How tradespeople can compare the three common ways of paying for work: per lead, a monthly fee or commission, and the questions to ask before you sign up.",
    published: "2026-10-27",
    category: "painting",
    heroSrc: "/homepage/driveway.jpg",
    heroAlt: "A cracked, weedy driveway next to a new block-paved driveway",
    intro:
      "Lead sites and directories charge in different ways, and it is hard to compare them. The number that matters is not the price on the page but what you pay for each job you actually win.",
    blocks: [
      { type: "h2", text: "The number to work out: cost per won job" },
      {
        type: "p",
        text: "Add up everything you pay a platform over a period, then divide by the number of jobs you won through it. That is your cost per won job. Compare it with the profit on those jobs. It is the only fair way to compare very different pricing.",
      },
      { type: "h2", text: "Pay per lead" },
      {
        type: "ul",
        items: [
          "You pay for each enquiry or contact, whether or not you win the work.",
          "Many sites share each lead with several tradespeople, so you are competing for it.",
          "It can work if the leads are good and you win a high share of them. It can be expensive if you do not.",
        ],
      },
      { type: "h2", text: "Monthly fee" },
      {
        type: "ul",
        items: [
          "A fixed amount each month, so your costs are predictable.",
          "You pay in quiet months as well as busy ones.",
          "It suits you best if the platform reliably brings enough work to cover it many times over.",
        ],
      },
      { type: "h2", text: "Commission" },
      {
        type: "ul",
        items: [
          "You pay a percentage, only when you win a job.",
          "There is no cost in a quiet month, but bigger jobs cost more, unless there is a cap.",
          "It aligns the platform's income with your success.",
        ],
      },
      { type: "h2", text: "Questions to ask any platform" },
      {
        type: "ul",
        items: [
          "How many tradespeople receive each lead?",
          "What happens if a lead turns out to be fake, a duplicate or not a real project?",
          "Is there a contract length, a cancellation fee or an automatic renewal?",
          "Are there other fees, such as for reviews, profile features or extra areas?",
          "Can I see how many jobs similar tradespeople win through it?",
        ],
      },
      { type: "h2", text: "Where GlowUpp stands" },
      {
        type: "p",
        text: `GlowUpp uses commission only. A profile is free, and you pay ${FEE_PERCENT} of the accepted quote (capped at ${FEE_CAP}) only when a client picks you. For clients you bring yourself through your own link, your first ${PRIVATE_LINK_FREE_JOBS} jobs are free before the same percentage applies. There is no monthly fee today. We are asking tradespeople whether they would prefer a flat monthly fee as an alternative, and nothing changes unless that is what people want.`,
      },
      { type: "h2", text: "Tell us which you would pick" },
      {
        type: "p",
        text: "If you are a tradesperson, you can tell us which you would prefer in a 20-second anonymous survey at glowupp.co.uk/poll. It is a survey only, and nothing changes today.",
      },
    ],
    faq: [
      {
        question: "How do I compare lead sites fairly?",
        answer: "Work out your cost per won job: total paid to the platform divided by jobs you won through it. Compare it with the profit on those jobs.",
      },
      {
        question: "Is commission better than a monthly fee?",
        answer: "It depends. Commission costs nothing in a quiet month but grows with the size of the job, while a monthly fee is predictable but is payable whether or not you win work.",
      },
      {
        question: "Does GlowUpp charge a monthly fee?",
        answer: "No. GlowUpp is free to join and charges commission only when you win a job. We are surveying tradespeople about whether they would like a flat monthly option as well.",
      },
    ],
    related: ["get-local-clients-without-paying-per-lead", "price-a-job-without-undercutting-yourself"],
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export function blogPath(slug?: string): string {
  return slug ? `/blog/${slug}` : "/blog";
}
