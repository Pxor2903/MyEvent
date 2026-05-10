import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAsyncAction } from '@/components/V2/useAsyncAction';
import { V2Card } from '@/components/V2/ui';
import { upsertProviderProfile } from '@/api/providers';
import { supabase } from '@/api';
import type { ProviderCategory, ProviderSpecification, ProviderZone } from '@/core/types';

export interface ProviderRegistrationFormProps {
  /** Après succès, clic sur « Retour à mon espace » */
  onReturn?: () => void;
  /** Alias (ex. redirection post-inscription) — appelé au clic sur le bouton de confirmation */
  onComplete?: () => void;
}

export const PROVIDER_CATEGORY_OPTIONS: { value: ProviderCategory; label: string }[] = [
  { value: 'photographer', label: 'Photographe' },
  { value: 'videographer', label: 'Vidéaste' },
  { value: 'caterer', label: 'Traiteur' },
  { value: 'venue', label: 'Salle / Lieu de réception' },
  { value: 'dj', label: 'DJ' },
  { value: 'musician', label: 'Musicien / Orchestre / Chanteur' },
  { value: 'florist', label: 'Fleuriste' },
  { value: 'decorator', label: 'Décorateur' },
  { value: 'graphic_designer', label: 'Graphiste' },
  { value: 'security', label: 'Sécurité' },
  { value: 'host', label: 'Animateur / Présentateur' },
  { value: 'transport', label: 'Transport' },
  { value: 'other', label: 'Autre' },
];

const RADIUS_VALUES = ['20', '50', '100', '200', '500', 'all_france'] as const;
type RadiusValue = (typeof RADIUS_VALUES)[number];

function categoryLabel(v: ProviderCategory): string {
  return PROVIDER_CATEGORY_OPTIONS.find((o) => o.value === v)?.label ?? v;
}

function normalizeUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

function isValidHttpUrl(raw: string): boolean {
  try {
    const u = new URL(normalizeUrl(raw));
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function radiusLabel(r: RadiusValue): string {
  if (r === 'all_france') return 'Toute la France';
  return `${r} km`;
}

const inputClass =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100';
const labelClass = 'block text-sm font-semibold text-slate-800 mb-1.5';

function readInitialCategoryFromSignup(): ProviderCategory | '' {
  if (typeof sessionStorage === 'undefined') return '';
  const raw = sessionStorage.getItem('register_provider_category');
  if (!raw) return '';
  const ok = PROVIDER_CATEGORY_OPTIONS.some((o) => o.value === raw);
  if (ok) {
    sessionStorage.removeItem('register_provider_category');
    return raw as ProviderCategory;
  }
  return '';
}

export const ProviderRegistrationForm: React.FC<ProviderRegistrationFormProps> = ({ onReturn, onComplete }) => {
  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);

  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState<ProviderCategory | ''>(() => readInitialCategoryFromSignup());
  const [description, setDescription] = useState('');
  const [priceRange, setPriceRange] = useState('');

  const [country, setCountry] = useState('France');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [radiusKm, setRadiusKm] = useState<RadiusValue>('50');
  const [coversEurope, setCoversEurope] = useState(false);
  const [coversWorldwide, setCoversWorldwide] = useState(false);

  const [officialFile, setOfficialFile] = useState<File | null>(null);
  const [professionalUrl, setProfessionalUrl] = useState('');
  const [portfolioFiles, setPortfolioFiles] = useState<File[]>([]);
  const [portfolioPreviews, setPortfolioPreviews] = useState<string[]>([]);
  const [extraDocFile, setExtraDocFile] = useState<File | null>(null);

  const [stepError, setStepError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { pending, run } = useAsyncAction();

  useEffect(() => {
    const urls = portfolioFiles.map((f) => URL.createObjectURL(f));
    setPortfolioPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [portfolioFiles]);

  const buildZone = useCallback((): ProviderZone => {
    const z: ProviderZone = {
      country: country.trim() || 'France',
      city: city.trim() || undefined,
      region: region.trim() || undefined,
      coversEurope,
      coversWorldwide,
    };
    if (radiusKm !== 'all_france') {
      z.radiusKm = Number(radiusKm);
    }
    return z;
  }, [city, country, region, radiusKm, coversEurope, coversWorldwide]);

  const buildSpecifications = useCallback((): ProviderSpecification[] => {
    const specs: ProviderSpecification[] = [
      {
        key: 'professional_url',
        label: 'Profil professionnel',
        value: normalizeUrl(professionalUrl),
      },
      {
        key: 'intervention_radius',
        label: "Rayon d'intervention",
        value: radiusLabel(radiusKm),
      },
    ];
    return specs;
  }, [professionalUrl, radiusKm]);

  const validateStep1 = (): boolean => {
    if (!businessName.trim()) {
      setStepError('Indique un nom commercial ou un nom d’artiste.');
      return false;
    }
    if (!category) {
      setStepError('Choisis une catégorie.');
      return false;
    }
    if (description.trim().length < 50) {
      setStepError('La description doit contenir au moins 50 caractères.');
      return false;
    }
    setStepError(null);
    return true;
  };

  const validateStep2 = (): boolean => {
    if (!city.trim()) {
      setStepError('Indique une ville principale.');
      return false;
    }
    setStepError(null);
    return true;
  };

  const validateStep3 = (): boolean => {
    if (!officialFile) {
      setStepError('Ajoute un document officiel (PDF ou image).');
      return false;
    }
    const okMime =
      officialFile.type === 'application/pdf' ||
      officialFile.type === 'image/jpeg' ||
      officialFile.type === 'image/png';
    const okExt = /\.(pdf|jpe?g|png)$/i.test(officialFile.name);
    if (!okMime && !okExt) {
      setStepError('Document officiel : uniquement PDF, JPG ou PNG.');
      return false;
    }
    if (!professionalUrl.trim() || !isValidHttpUrl(professionalUrl)) {
      setStepError('Indique un lien valide vers ton profil professionnel (URL complète ou domaine).');
      return false;
    }
    if (portfolioFiles.length > 5) {
      setStepError('Maximum 5 photos pour le portfolio.');
      return false;
    }
    for (const f of portfolioFiles) {
      const mimeOk = f.type === 'image/jpeg' || f.type === 'image/png' || f.type === 'image/webp';
      const extOk = /\.(jpe?g|png|webp)$/i.test(f.name);
      if (!mimeOk && !extOk) {
        setStepError(`Photo « ${f.name} » : formats acceptés JPG, PNG, WEBP.`);
        return false;
      }
    }
    if (extraDocFile) {
      const em =
        extraDocFile.type === 'application/pdf' ||
        extraDocFile.type === 'image/jpeg' ||
        extraDocFile.type === 'image/png';
      const ee = /\.(pdf|jpe?g|png)$/i.test(extraDocFile.name);
      if (!em && !ee) {
        setStepError('Document optionnel : uniquement PDF, JPG ou PNG.');
        return false;
      }
    }
    setStepError(null);
    return true;
  };

  const canSubmitFinal = useMemo(() => {
    return (
      businessName.trim() &&
      category &&
      description.trim().length >= 50 &&
      city.trim() &&
      officialFile &&
      professionalUrl.trim() &&
      isValidHttpUrl(professionalUrl) &&
      portfolioFiles.length <= 5
    );
  }, [businessName, category, description, city, officialFile, professionalUrl, portfolioFiles.length]);

  const goNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step === 3 && !validateStep3()) return;
    setStepError(null);
    setStep((s) => Math.min(4, s + 1));
  };

  const goPrev = () => {
    setStepError(null);
    setStep((s) => Math.max(1, s - 1));
  };

  const handlePortfolioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const merged = [...portfolioFiles, ...files].slice(0, 5);
    setPortfolioFiles(merged);
    e.target.value = '';
  };

  const removePortfolioAt = (idx: number) => {
    setPortfolioFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = () => {
    setSubmitError(null);
    if (!validateStep3() || !canSubmitFinal) return;

    void run(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Tu dois être connecté pour envoyer ta demande.');

      const zone = buildZone();
      const specifications = buildSpecifications();
      const cat = category as ProviderCategory;

      let profile = await upsertProviderProfile({
        businessName: businessName.trim(),
        description: description.trim(),
        category: cat,
        zone,
        specifications,
        priceRange: priceRange.trim() || undefined,
        photos: [],
        unavailabilities: [],
      });
      if (!profile) throw new Error('Impossible d’enregistrer le profil prestataire. Réessaie.');

      const uid = user.id;
      const ext =
        officialFile!.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'pdf';
      const officialPath = `provider-docs/${uid}/official-doc.${ext}`;
      const { error: upOfficial } = await supabase.storage
        .from('event-files')
        .upload(officialPath, officialFile!, { upsert: true });
      if (upOfficial) throw new Error(upOfficial.message || 'Échec de l’upload du document officiel.');

      const officialPublic = supabase.storage.from('event-files').getPublicUrl(officialPath).data.publicUrl;
      const { error: insOfficial } = await supabase.from('provider_documents').insert({
        provider_id: profile.id,
        name: officialFile!.name,
        url: officialPublic,
        type: 'kbis',
      });
      if (insOfficial) throw new Error(insOfficial.message || 'Échec de l’enregistrement du document officiel.');

      const photoUrls: string[] = [];
      for (const f of portfolioFiles) {
        const pext = (f.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
        const ppath = `provider-photos/${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${pext}`;
        const { error: phErr } = await supabase.storage.from('event-files').upload(ppath, f);
        if (phErr) throw new Error(`Photo « ${f.name} » : ${phErr.message}`);
        const url = supabase.storage.from('event-files').getPublicUrl(ppath).data.publicUrl;
        photoUrls.push(url);
        const { error: pIns } = await supabase.from('provider_documents').insert({
          provider_id: profile.id,
          name: f.name,
          url,
          type: 'portfolio',
        });
        if (pIns) throw new Error(pIns.message || `Échec enregistrement portfolio : ${f.name}`);
      }

      if (extraDocFile) {
        const eext =
          extraDocFile.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'pdf';
        const epath = `provider-docs/${uid}/extra-${Date.now()}.${eext}`;
        const { error: exErr } = await supabase.storage.from('event-files').upload(epath, extraDocFile);
        if (exErr) throw new Error(exErr.message || 'Échec de l’upload du document optionnel.');
        const exUrl = supabase.storage.from('event-files').getPublicUrl(epath).data.publicUrl;
        const { error: exIns } = await supabase.from('provider_documents').insert({
          provider_id: profile.id,
          name: extraDocFile.name,
          url: exUrl,
          type: 'other',
        });
        if (exIns) throw new Error(exIns.message || 'Échec enregistrement du document optionnel.');
      }

      profile = await upsertProviderProfile({
        businessName: businessName.trim(),
        description: description.trim(),
        category: cat,
        zone,
        specifications,
        priceRange: priceRange.trim() || undefined,
        photos: photoUrls,
        unavailabilities: [],
      });
      if (!profile) throw new Error('Impossible de finaliser ton profil avec les photos.');

      setDone(true);
    }).catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : 'Une erreur est survenue.';
      setSubmitError(msg);
    });
  };

  if (done) {
    return (
      <div className="max-w-lg mx-auto px-4 py-10">
        <V2Card className="p-8 text-center space-y-6">
          <div className="text-4xl" aria-hidden>
            ✓
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Demande envoyée !</h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Notre équipe examine ton dossier. Tu recevras une notification dès validation.
          </p>
          <button
            type="button"
            onClick={() => {
              onComplete?.();
              onReturn?.();
            }}
            className="w-full rounded-2xl bg-teal-600 text-white py-3 text-sm font-bold shadow-lg shadow-teal-100 hover:bg-teal-700 transition-colors"
          >
            Retour à mon espace
          </button>
        </V2Card>
      </div>
    );
  }

  const steps = [
    { n: 1, title: 'Informations' },
    { n: 2, title: 'Zone' },
    { n: 3, title: 'Justificatifs' },
    { n: 4, title: 'Validation' },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-16">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Devenir prestataire</h1>
        <p className="text-sm text-slate-600">Complète les étapes pour soumettre ta demande.</p>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-between gap-2 mb-8">
        {steps.map((s, i) => (
          <React.Fragment key={s.n}>
            <div className="flex flex-col items-center flex-1 min-w-0">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black border-2 transition-colors ${
                  step >= s.n
                    ? 'bg-teal-600 border-teal-600 text-white'
                    : 'bg-white border-slate-200 text-slate-400'
                }`}
              >
                {s.n}
              </div>
              <span className="text-[10px] font-semibold text-slate-500 mt-1.5 truncate w-full text-center">
                {s.title}
              </span>
            </div>
            {i < steps.length - 1 ? (
              <div
                className={`h-0.5 flex-1 mb-6 rounded ${step > s.n ? 'bg-teal-500' : 'bg-slate-200'}`}
                aria-hidden
              />
            ) : null}
          </React.Fragment>
        ))}
      </div>

      {(stepError || submitError) && (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 font-semibold">
          {submitError ?? stepError}
        </div>
      )}

      {step === 1 && (
        <V2Card className="p-6 space-y-5">
          <h2 className="text-lg font-black text-slate-900">Informations de base</h2>
          <div>
            <label className={labelClass}>Nom commercial / nom d’artiste *</label>
            <input
              className={inputClass}
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Ex. Studio Lumière"
              required
            />
          </div>
          <div>
            <label className={labelClass}>Catégorie *</label>
            <select
              className={inputClass}
              value={category}
              onChange={(e) => setCategory(e.target.value as ProviderCategory | '')}
              required
            >
              <option value="">Choisir une catégorie…</option>
              {PROVIDER_CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Description de l’activité * (min. 50 caractères)</label>
            <textarea
              className={`${inputClass} min-h-[140px] resize-y`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décris ton activité, ton style, tes prestations…"
              required
            />
            <p className="text-xs text-slate-500 mt-1">{description.trim().length} / 50 min.</p>
          </div>
          <div>
            <label className={labelClass}>Tarif indicatif (optionnel)</label>
            <input
              className={inputClass}
              value={priceRange}
              onChange={(e) => setPriceRange(e.target.value)}
              placeholder='Ex. À partir de 500€'
            />
          </div>
        </V2Card>
      )}

      {step === 2 && (
        <V2Card className="p-6 space-y-5">
          <h2 className="text-lg font-black text-slate-900">Zone géographique</h2>
          <div>
            <label className={labelClass}>Pays principal</label>
            <input className={inputClass} value={country} onChange={(e) => setCountry(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Ville principale *</label>
            <input
              className={inputClass}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ex. Lyon"
            />
          </div>
          <div>
            <label className={labelClass}>Région (optionnel)</label>
            <input className={inputClass} value={region} onChange={(e) => setRegion(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Rayon d’intervention</label>
            <select
              className={inputClass}
              value={radiusKm}
              onChange={(e) => setRadiusKm(e.target.value as RadiusValue)}
            >
              {RADIUS_VALUES.filter((v) => v !== 'all_france').map((v) => (
                <option key={v} value={v}>
                  {v} km
                </option>
              ))}
              <option value="all_france">Toute la France</option>
            </select>
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={coversEurope}
              onChange={(e) => setCoversEurope(e.target.checked)}
              className="mt-1 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm text-slate-700 font-medium">J’interviens dans toute l’Europe</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={coversWorldwide}
              onChange={(e) => setCoversWorldwide(e.target.checked)}
              className="mt-1 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm text-slate-700 font-medium">J’interviens dans le monde entier</span>
          </label>
        </V2Card>
      )}

      {step === 3 && (
        <V2Card className="p-6 space-y-6">
          <h2 className="text-lg font-black text-slate-900">Justificatifs</h2>

          <div className="rounded-2xl border border-teal-100 bg-teal-50/80 px-4 py-3 text-sm text-teal-900 leading-relaxed">
            Vos documents sont utilisés uniquement pour vérifier votre activité. Ils ne sont jamais partagés avec
            les autres utilisateurs.
          </div>

          <div>
            <label className={labelClass}>Document officiel de votre activité *</label>
            <p className="text-xs text-slate-500 mb-2">
              Kbis, extrait INSEE, statuts auto-entrepreneur, contrat de location de salle, etc.
            </p>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              className="text-sm text-slate-600 file:mr-3 file:rounded-xl file:border-0 file:bg-teal-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
              onChange={(e) => setOfficialFile(e.target.files?.[0] ?? null)}
            />
            {officialFile ? (
              <p className="text-xs text-slate-600 mt-2 font-medium">{officialFile.name}</p>
            ) : null}
          </div>

          <div>
            <label className={labelClass}>Lien vers votre profil professionnel *</label>
            <p className="text-xs text-slate-500 mb-2">
              Page Instagram, LinkedIn, site web, page Facebook professionnelle, etc.
            </p>
            <input
              className={inputClass}
              value={professionalUrl}
              onChange={(e) => setProfessionalUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>

          <div>
            <label className={labelClass}>Photos de référence ou portfolio (optionnel, max 5)</label>
            <p className="text-xs text-slate-500 mb-2">
              Recommandé : montrez votre travail pour augmenter vos chances d’être contacté.
            </p>
            <input
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              className="text-sm text-slate-600 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-800 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
              onChange={handlePortfolioChange}
              disabled={portfolioFiles.length >= 5}
            />
            {portfolioPreviews.length > 0 ? (
              <div className="flex flex-wrap gap-3 mt-4">
                {portfolioPreviews.map((src, idx) => (
                  <div key={src} className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePortfolioAt(idx)}
                      className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/60 text-white text-xs font-bold hover:bg-black/80"
                      aria-label="Retirer la photo"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div>
            <label className={labelClass}>Autre document (optionnel)</label>
            <p className="text-xs text-slate-500 mb-2">
              Certification, diplôme, assurance, ou tout document pertinent.
            </p>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              className="text-sm text-slate-600 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-700 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
              onChange={(e) => setExtraDocFile(e.target.files?.[0] ?? null)}
            />
            {extraDocFile ? (
              <p className="text-xs text-slate-600 mt-2 font-medium">{extraDocFile.name}</p>
            ) : null}
          </div>
        </V2Card>
      )}

      {step === 4 && (
        <V2Card className="p-6 space-y-5">
          <h2 className="text-lg font-black text-slate-900">Récapitulatif</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
              <dt className="text-slate-500 font-medium">Nom commercial</dt>
              <dd className="text-slate-900 font-semibold text-right">{businessName || '—'}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
              <dt className="text-slate-500 font-medium">Catégorie</dt>
              <dd className="text-slate-900 font-semibold text-right">
                {category ? categoryLabel(category as ProviderCategory) : '—'}
              </dd>
            </div>
            <div className="border-b border-slate-100 pb-2">
              <dt className="text-slate-500 font-medium mb-1">Description</dt>
              <dd className="text-slate-800 whitespace-pre-wrap">{description || '—'}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
              <dt className="text-slate-500 font-medium">Tarif indicatif</dt>
              <dd className="text-slate-900 font-semibold text-right">{priceRange || '—'}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
              <dt className="text-slate-500 font-medium">Zone</dt>
              <dd className="text-slate-900 font-semibold text-right">
                {city}, {country}
                {region ? ` (${region})` : ''}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
              <dt className="text-slate-500 font-medium">Rayon</dt>
              <dd className="text-slate-900 font-semibold text-right">{radiusLabel(radiusKm)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
              <dt className="text-slate-500 font-medium">Europe / Monde</dt>
              <dd className="text-slate-900 font-semibold text-right">
                {[coversEurope && 'Europe', coversWorldwide && 'Monde'].filter(Boolean).join(', ') || '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
              <dt className="text-slate-500 font-medium">Document officiel</dt>
              <dd className="text-slate-900 font-semibold text-right">{officialFile?.name ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
              <dt className="text-slate-500 font-medium">Profil pro</dt>
              <dd className="text-teal-700 font-semibold text-right break-all">{normalizeUrl(professionalUrl)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
              <dt className="text-slate-500 font-medium">Photos portfolio</dt>
              <dd className="text-slate-900 font-semibold text-right">{portfolioFiles.length} fichier(s)</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500 font-medium">Document optionnel</dt>
              <dd className="text-slate-900 font-semibold text-right">{extraDocFile?.name ?? '—'}</dd>
            </div>
          </dl>

          <p className="text-sm text-slate-600 bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100">
            Votre demande sera examinée par notre équipe sous 48h. Vous recevrez une notification dès validation.
          </p>

          <button
            type="button"
            disabled={!canSubmitFinal || pending}
            onClick={() => handleSubmit()}
            className="w-full rounded-2xl bg-teal-600 text-white py-3.5 text-sm font-black shadow-lg shadow-teal-100 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {pending ? 'Envoi en cours…' : 'Envoyer ma demande'}
          </button>
        </V2Card>
      )}

      <div className="flex justify-between gap-3 mt-6">
        <button
          type="button"
          onClick={goPrev}
          disabled={step === 1 || pending}
          className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          Précédent
        </button>
        {step < 4 ? (
          <button
            type="button"
            onClick={goNext}
            disabled={pending}
            className="rounded-2xl bg-teal-600 text-white px-5 py-2.5 text-sm font-bold hover:bg-teal-700 disabled:opacity-50"
          >
            Suivant
          </button>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
};
