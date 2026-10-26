import type { FaqItem } from "@/lib/seo";

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
  title: string;
  /** Meta description and the card summary on /blog (keep to about 155 characters). */
  description: string;
  /** ISO date the post was first published. */
  published: string;
  /** Category key (src/lib/homepage-categories.ts): picks the call-to-action link and the example image. */
  category: string;
  heroSrc: string;
  heroAlt: string;
  intro: string;
  blocks: BlogBlock[];
  faq: FaqItem[];
  /** Slugs of other posts to link to at the end. */
  related: string[];
}

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
    related: ["kitchen-ideas-small-terraced-house", "small-bathroom-ideas"],
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export function blogPath(slug?: string): string {
  return slug ? `/blog/${slug}` : "/blog";
}
