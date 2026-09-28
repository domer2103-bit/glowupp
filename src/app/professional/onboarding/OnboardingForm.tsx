"use client";

import { useActionState, useState } from "react";
import { createProfessionalProfile, type ActionState } from "@/lib/actions/auth";
import { HOMEPAGE_CATEGORIES } from "@/lib/homepage-categories";
import { CategoryIcon } from "@/components/CategoryIcon";
import { getOutwardCode } from "@/lib/postcode";

const RADIUS_OPTIONS = [5, 10, 15, 25, 40];

const STEPS = [
  { id: "trade", label: "Your Trade" },
  { id: "area", label: "Your Area" },
  { id: "profile", label: "Your Profile" },
  { id: "photos", label: "Your Work" },
];

function inputClass(extra = "") {
  return `rounded-lg border border-zinc-300 px-3 py-2 text-sm text-[#132a4d] outline-none focus:border-[#3a6694] ${extra}`;
}

export function OnboardingForm({ userName, userEmail }: { userName: string; userEmail: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createProfessionalProfile, undefined);

  const [postcode, setPostcode] = useState("");
  const [areaChips, setAreaChips] = useState<string[]>([]);
  const [areaInput, setAreaInput] = useState("");
  const [radiusMiles, setRadiusMiles] = useState<number | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);

  function addAreaChip(raw: string) {
    const value = raw.trim().toUpperCase();
    if (!value) return;
    setAreaChips((prev) => (prev.includes(value) ? prev : [...prev, value]));
    setAreaInput("");
  }

  function suggestAreasFromPostcode() {
    if (!postcode.trim()) return;
    const outward = getOutwardCode(postcode);
    if (!outward) return;
    const areaLetters = outward.match(/^[A-Z]+/)?.[0] ?? outward;
    addAreaChip(outward);
    if (areaLetters !== outward) addAreaChip(areaLetters);
  }

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl shadow-blue-900/10 sm:p-8">
      <h2 className="text-xl font-semibold text-[#132a4d]">Create your professional profile</h2>
      <nav className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-b border-zinc-200 pb-4 text-sm">
        {STEPS.map((step, i) => (
          <a
            key={step.id}
            href={`#${step.id}`}
            className={`flex items-center gap-2 ${i === 0 ? "font-semibold text-[#3a6694]" : "text-zinc-500 hover:text-[#132a4d]"}`}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                i === 0 ? "bg-[#3a6694] text-white" : "bg-zinc-100 text-zinc-500"
              }`}
            >
              {i + 1}
            </span>
            {step.label}
          </a>
        ))}
      </nav>

      <form action={action} className="mt-6 flex flex-col gap-10">
        <section id="trade" className="scroll-mt-6">
          <h3 className="mb-1 font-semibold text-[#132a4d]">What do you do?</h3>
          <p className="mb-4 text-sm text-zinc-500">Pick every trade you offer — homeowners search by category.</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {HOMEPAGE_CATEGORIES.map((cat) => (
              <label
                key={cat.key}
                className="group flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-zinc-200 p-4 text-center transition has-checked:border-[#3a6694] has-checked:bg-blue-50"
              >
                <input type="checkbox" name="services" value={cat.key} className="sr-only" />
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-[#3a6694] group-has-checked:bg-white">
                  <CategoryIcon type={cat.key} className="h-5 w-5" />
                </span>
                <span className="text-sm font-medium text-[#132a4d]">{cat.displayName}</span>
              </label>
            ))}
          </div>
          {state?.error?.toLowerCase().includes("trade") && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
        </section>

        <section id="area" className="scroll-mt-6">
          <h3 className="mb-1 font-semibold text-[#132a4d]">Where do you work?</h3>
          <p className="mb-4 text-sm text-zinc-500">Your base postcode, plus the areas you&apos;re willing to travel to.</p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              name="postcode"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              placeholder="Postcode"
              required
              className={inputClass("sm:w-48")}
            />
            <button
              type="button"
              onClick={suggestAreasFromPostcode}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-[#132a4d] hover:border-[#3a6694]"
            >
              Suggest my area
            </button>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-sm font-medium text-[#132a4d]">Areas you cover</p>
            <div className="flex flex-wrap gap-2">
              {areaChips.map((chip) => (
                <span
                  key={chip}
                  className="flex items-center gap-1 rounded-full border border-[#3a6694] bg-blue-50 px-3 py-1 text-sm text-[#132a4d]"
                >
                  {chip}
                  <button
                    type="button"
                    onClick={() => setAreaChips((prev) => prev.filter((c) => c !== chip))}
                    className="text-zinc-400 hover:text-red-600"
                    aria-label={`Remove ${chip}`}
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                value={areaInput}
                onChange={(e) => setAreaInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addAreaChip(areaInput);
                  }
                }}
                placeholder="e.g. L18, then Enter"
                className="min-w-[10rem] flex-1 rounded-full border border-dashed border-zinc-300 px-3 py-1 text-sm outline-none focus:border-[#3a6694]"
              />
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              A district (e.g. &quot;L18&quot;) or a whole postcode area (e.g. &quot;L&quot;) — add as many as you cover.
            </p>
            <input type="hidden" name="serviceAreaPrefixes" value={areaChips.join(",")} />
          </div>

          <div className="mt-4">
            <p className="mb-2 text-sm font-medium text-[#132a4d]">How far will you travel? (optional)</p>
            <div className="flex flex-wrap gap-2">
              {RADIUS_OPTIONS.map((miles) => (
                <button
                  key={miles}
                  type="button"
                  onClick={() => setRadiusMiles((prev) => (prev === miles ? null : miles))}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    radiusMiles === miles
                      ? "border-[#3a6694] bg-[#3a6694] text-white"
                      : "border-zinc-300 bg-white text-[#132a4d] hover:border-[#3a6694]"
                  }`}
                >
                  {miles} miles
                </button>
              ))}
            </div>
            <input type="hidden" name="serviceRadiusMiles" value={radiusMiles ?? ""} />
          </div>

          {state?.error?.toLowerCase().includes("postcode area") && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
        </section>

        <section id="profile" className="scroll-mt-6">
          <h3 className="mb-1 font-semibold text-[#132a4d]">Tell homeowners about your business</h3>
          <p className="mb-4 text-sm text-zinc-500">
            Signed in as {userName} ({userEmail})
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input name="businessName" placeholder="Business name" required className={inputClass()} />
            <input name="phone" type="tel" placeholder="Phone number (optional)" className={inputClass()} />
            <input
              name="yearsExperience"
              type="number"
              min={0}
              max={70}
              placeholder="Years of experience (optional)"
              className={inputClass()}
            />
          </div>
          <textarea
            name="description"
            placeholder="Short description of your business (optional)"
            rows={3}
            className={inputClass("mt-3 w-full")}
          />
        </section>

        <section id="photos" className="scroll-mt-6">
          <h3 className="mb-1 font-semibold text-[#132a4d]">Add your best work</h3>
          <p className="mb-4 text-sm text-zinc-500">Optional — up to 6 photos homeowners see on your quotes.</p>
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-zinc-300 px-6 py-8 text-center hover:border-[#3a6694]">
            <span className="text-2xl text-[#3a6694]">↑</span>
            <span className="text-sm font-medium text-[#132a4d]">Drag photos here, or click to choose</span>
            <span className="text-xs text-zinc-500">JPEG, PNG, WEBP, or HEIC</span>
            <input
              type="file"
              name="photos"
              multiple
              accept="image/jpeg,image/png,image/webp,image/heic"
              className="hidden"
              onChange={(e) => setPhotos(Array.from(e.target.files ?? []).slice(0, 6))}
            />
          </label>
          {photos.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {photos.map((file, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="aspect-square rounded-lg border border-zinc-200 object-cover"
                />
              ))}
            </div>
          )}
        </section>

        {state?.error && !state.error.toLowerCase().includes("trade") && !state.error.toLowerCase().includes("postcode area") && (
          <p className="text-sm text-red-600">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-[#3a6694] px-6 py-3 text-sm font-medium text-white hover:bg-[#2c5075] disabled:opacity-50"
        >
          {pending ? "Creating your profile…" : "Create My Profile"}
        </button>
        <p className="-mt-6 text-center text-xs text-zinc-500">You can update your profile and service area anytime.</p>
      </form>
    </div>
  );
}
