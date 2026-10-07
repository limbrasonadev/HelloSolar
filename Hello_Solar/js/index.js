// Initialize Lucide icons on page load
lucide.createIcons();

// PRODUCT DATA SPECIFICATIONS
const PRODUCTS = {
    'hs6-lite': {
        id: 'hs6-lite',
        name: 'HS 6 LITE',
        tag: 'OUR RECOMMENDATION',
        tagline: 'Smart. Reliable. Built for Everyday Savings.',
        panels: '4.96kW',
        inverter: '6kW',
        battery: '4.8kWh',
        idealBills: '₱5,000–₱8,000',
        monthly: '₱7,650',
        cashPrice: '₱270,000',
        estSavings: '₱4,200 – ₱6,800',
        features: [
            'Lower your electric bill every month',
            'Keep your lights, fans and Wi-Fi running during brownouts for up to 8hrs (*Based on 500W essential household load)',
            'Lowest upfront investment',
            'Ideal if your electric bill is around ₱5,000–₱8,000/month',
        ]
    },
    'hs6-pro': {
        id: 'hs6-pro',
        name: 'HS 6 PRO',
        tag: 'MOST POPULAR',
        tagline: 'More power, more backup for seamless family living.',
        badge: 'Most Popular',
        panels: '6.2kW',
        inverter: '6kW',
        battery: '9.6kWh',
        idealBills: '₱5,000–₱8,000',
        monthly: '₱9,066.67',
        cashPrice: '₱320,000',
        estSavings: '₱5,500 – ₱8,400',
        features: [
            'Bigger savings every month',
            'Reliable backup during brownouts for up to 18hrs (*Based on a 500W essential household load)',
            'Covers most family homes comfortably',
            'Best value for money',
            'Ideal if your electric bill is around ₱5,000–₱8,000/month'
        ]
    },
    'hs6-max': {
        id: 'hs6-max',
        name: 'HS 6 MAX',
        tagline: 'Maximum solar yield and multi-aircon whole home power.',
        badge: 'For bigger homes',
        panels: '8.27kW',
        inverter: '8kW',
        battery: '9.6kWh',
        idealBills: '₱8,000–₱12,000+',
        monthly: '₱10,908.33',
        cashPrice: '₱385,000',
        estSavings: '₱7,800 – ₱12,500',
        features: [
            'Ultimate system for long brownouts',
            'Run essentials during outages for up to 28hrs (*Based on a 500W essential household load)',
            'Store more solar energy for nighttime use',
            'Best for future expansion',
            'Ideal if your electric bill is around ₱8,000–₱13,000/month'
        ]
    },
    'hs8-pro': {
        id: 'hs8-pro',
        name: 'HS 8 PRO',
        tag: 'EXPANDED RESIDENTIAL / ESTATE',
        tagline: 'High-yield whole-day solar with expanded battery storage.',
        panels: '8kW',
        inverter: '8kW',
        battery: '16kWh',
        idealBills: '₱8,000–₱13,000',
        monthly: '₱11,900',
        cashPrice: '₱420,000',
        estSavings: '₱10,500 – ₱16,000',
        features: [
            'Bigger savings every month',
            'Reliable backup during brownouts for up to 28hrs (*Based on a 500W essential household load)',
            'Covers most family homes comfortably',
            'Best value for money',
            'Ideal if your electric bill is around ₱8,000-₱13,000/month'
        ]
    },
    'hs8-max': {
        id: 'hs8-max',
        name: 'HS 8 MAX',
        tag: 'COMMERCIAL & VILLA',
        tagline: 'Built for multi-story villas, resorts, and commercial hubs.',
        panels: '8kW',
        inverter: '12kW',
        battery: '32kWh',
        idealBills: '₱13,000–₱18,000',
        monthly: '₱16,859',
        cashPrice: '₱595,000',
        estSavings: '₱11,500 – ₱16,000',
        features: [
            '8kw Panels, 12kw Inverter, 32kwh Battery Maximum Backup Power',
            'Ultimate system for long brownouts. Run essentials during outages for 56hrs (*Based on a 500W essential household load)',
            'Store more solar energy for nighttime use',
            'Best for future expansion',
            'Run multiple AC units and large appliances seamlessly',
            'Ideal if your electric bill is around ₱13,000-₱18,000/month'
        ]
    },
    'hs10-pro': {
        id: 'hs10-pro',
        name: 'HS 10 PRO',
        tag: 'ENTERPRISE / BUSINESS',
        tagline: 'Maximum generation capacity for intensive daytime power.',

        panels: '10kW',
        inverter: '12kW',
        battery: '16kWh',
        idealBills: '₱17,000-₱21,000',
        monthly: '₱15,159',
        cashPrice: '₱535,000',
        estSavings: '₱21,000 – ₱30,000+',
        features: [
            '10kw Panels, 12kw Inverter, 16kwh Battery Perfect Balance',
            'Bigger savings every month',
            'Reliable backup during brownouts for up to 28hrs (*Based on a 500W essential household load)',
            'Covers most family homes comfortably',
            'Best value for money',
            'Ideal if your electric bill is around ₱17,000-₱21,000/month'
        ]
    },
    'hs12-max': {
        id: 'hs12-max',
        name: 'HS 12 MAX',
        tag: 'COMMERCIAL & INDUSTRIAL / ESTATE',
        tagline: 'Ultimate generation capacity and mega battery reserve for heavy loads.',

        panels: '12kW',
        inverter: '16kW',
        battery: '32kWh',
        idealBills: '₱18,000-₱25,000',
        monthly: '₱21,533.33',
        cashPrice: '₱760,000',
        estSavings: '₱24,000 – ₱40,000+',
        features: [
            '12kw Panels, 16kw Inverter, 32kwh Battery Maximum Backup Power',
            'Ultimate system for long brownouts',
            'Run essentials during outages for 56hrs (*Based on a 500W essential household load)',
            'Store more solar energy for nighttime use',
            'Best for future expansion',
            'Ideal if your electric bill is around ₱18,000-₱25,000/month'
        ]
    }
};

// PRICING / OPTION SELECTION & CIRCULAR CAROUSEL ENGINE
let selectedOption = 'hs6-pro';
const TOTAL_PACKAGES = 7;
const CLONE_COUNT = 3;
let carouselCurrentPackage = 1; // 1 to 7
let carouselTrackIndex = CLONE_COUNT; // starts at 3 (Card 1)
let carouselIsTransitioning = false;
let carouselTransitionTimeout = null;

function updateOptionsUI() {
    const productIds = Object.keys(PRODUCTS);

    productIds.forEach(id => {
        const cards = document.querySelectorAll(`[data-product-card="${id}"]`);
        cards.forEach(card => {
            const isSelected = (id === selectedOption);
            const actionBtn = card.querySelector('[data-action="details"]');

            if (isSelected) {
                card.classList.add('is-selected');
                card.classList.remove('border-[#FCD34D]', 'border-[#E5E0D8]', 'shadow-xs');

                if (actionBtn) {
                    actionBtn.className = 'w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold py-3.5 2xl:py-4 rounded-xl text-xs sm:text-sm 2xl:text-base transition shadow-sm hover:shadow flex items-center justify-center gap-1.5 cursor-pointer';
                }
            } else {
                card.classList.remove('is-selected');
                card.classList.add('border-[#FCD34D]', 'shadow-xs');

                if (actionBtn) {
                    actionBtn.className = 'w-full border border-stone-300 hover:bg-amber-50/40 hover:border-amber-400/80 text-[#1C1917] font-extrabold py-3.5 2xl:py-4 rounded-xl text-xs sm:text-sm 2xl:text-base transition flex items-center justify-center gap-1.5 cursor-pointer';
                }
            }
        });
    });

    // IMPORTANT: "Most Popular" is permanent and independent on HS 6 PRO
    const popularBadge = document.getElementById('badge-most-popular');
    if (popularBadge) {
        popularBadge.style.display = 'block';
    }
}

function selectOption(productId) {
    if (!PRODUCTS[productId]) return;
    selectedOption = productId;
    updateOptionsUI();
}

function getCarouselStepWidth() {
    const track = document.getElementById('optionsCarouselTrack');
    if (!track || !track.children[0]) return 0;
    const card = track.children[0];
    const cardWidth = card.getBoundingClientRect().width;
    const gap = parseFloat(window.getComputedStyle(track).gap) || 24;
    return cardWidth + gap;
}

function updateCarouselPosition(animated = true) {
    const track = document.getElementById('optionsCarouselTrack');
    if (!track) return;

    const step = getCarouselStepWidth();
    const offset = carouselTrackIndex * step;

    if (animated) {
        track.style.transition = 'transform 500ms cubic-bezier(0.16, 1, 0.3, 1)';
    } else {
        track.style.transition = 'none';
    }

    track.style.transform = `translateX(-${offset}px)`;

    if (!animated) {
        void track.offsetHeight;
    }
}

function updateCarouselPagination() {
    const dots = document.querySelectorAll('.options-page-dot');
    dots.forEach((dot, index) => {
        const pkgIndex = index + 1;
        if (pkgIndex === carouselCurrentPackage) {
            dot.className = 'options-page-dot w-6 h-2 bg-amber-500 rounded-full transition-all duration-300 cursor-pointer';
            dot.setAttribute('aria-current', 'true');
        } else {
            dot.className = 'options-page-dot w-2 h-2 bg-stone-300 hover:bg-amber-300 rounded-full transition-all duration-300 cursor-pointer';
            dot.removeAttribute('aria-current');
        }
    });
}

function initCarousel() {
    const track = document.getElementById('optionsCarouselTrack');
    if (!track) return;

    if (track.dataset.carouselInitialized === 'true') return;
    track.dataset.carouselInitialized = 'true';

    const cards = Array.from(track.children);
    if (cards.length !== TOTAL_PACKAGES) return;

    function cleanClone(clone) {
        clone.removeAttribute('id');
        clone.setAttribute('aria-hidden', 'true');
        clone.setAttribute('tabindex', '-1');
        clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
    }

    // Trailing clones (cards 1, 2, 3 appended)
    for (let i = 0; i < CLONE_COUNT; i++) {
        const clone = cards[i].cloneNode(true);
        cleanClone(clone);
        track.appendChild(clone);
    }

    // Leading clones (cards 5, 6, 7 prepended)
    for (let i = TOTAL_PACKAGES - 1; i >= TOTAL_PACKAGES - CLONE_COUNT; i--) {
        const clone = cards[i].cloneNode(true);
        cleanClone(clone);
        track.insertBefore(clone, track.firstChild);
    }

    // Position at initial real card (Package 1)
    updateCarouselPosition(false);

    // Handle seamless jump when transition ends
    track.addEventListener('transitionend', (e) => {
        if (e.target !== track) return;
        clearTimeout(carouselTransitionTimeout);
        carouselIsTransitioning = false;

        // Scrolled past card 7 into trailing clones -> seamlessly jump to real card
        if (carouselTrackIndex >= TOTAL_PACKAGES + CLONE_COUNT) {
            carouselTrackIndex = carouselTrackIndex - TOTAL_PACKAGES;
            updateCarouselPosition(false);
        }
        // Scrolled before card 1 into leading clones -> seamlessly jump to real card
        else if (carouselTrackIndex < CLONE_COUNT) {
            carouselTrackIndex = carouselTrackIndex + TOTAL_PACKAGES;
            updateCarouselPosition(false);
        }
    });

    // Delegate card selection and details modal trigger to support clones
    track.addEventListener('click', (e) => {
        const detailBtn = e.target.closest('[data-action="details"]');
        if (detailBtn) {
            e.preventDefault();
            const productId = detailBtn.getAttribute('data-product') || 'hs6-lite';
            selectOption(productId);
            viewProductDetails(productId);
            return;
        }

        const card = e.target.closest('[data-product-card]');
        if (card) {
            const productId = card.getAttribute('data-product-card');
            if (productId) selectOption(productId);
        }
    });

    track.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            const detailBtn = e.target.closest('[data-action="details"]');
            if (detailBtn) {
                e.preventDefault();
                const productId = detailBtn.getAttribute('data-product') || 'hs6-lite';
                selectOption(productId);
                viewProductDetails(productId);
                return;
            }

            const card = e.target.closest('[data-product-card]');
            if (card) {
                e.preventDefault();
                const productId = card.getAttribute('data-product-card');
                if (productId) selectOption(productId);
            }
        }
    });

    window.addEventListener('resize', () => {
        updateCarouselPosition(false);
    }, { passive: true });
}

function nextPackage() {
    if (carouselIsTransitioning) return;
    carouselIsTransitioning = true;
    carouselTrackIndex++;
    carouselCurrentPackage = (carouselCurrentPackage % TOTAL_PACKAGES) + 1;
    updateCarouselPagination();
    updateCarouselPosition(true);

    clearTimeout(carouselTransitionTimeout);
    carouselTransitionTimeout = setTimeout(() => {
        if (carouselIsTransitioning) {
            carouselIsTransitioning = false;
            if (carouselTrackIndex >= TOTAL_PACKAGES + CLONE_COUNT) {
                carouselTrackIndex = carouselTrackIndex - TOTAL_PACKAGES;
                updateCarouselPosition(false);
            }
        }
    }, 550);
}

function prevPackage() {
    if (carouselIsTransitioning) return;
    carouselIsTransitioning = true;
    carouselTrackIndex--;
    carouselCurrentPackage = carouselCurrentPackage === 1 ? TOTAL_PACKAGES : carouselCurrentPackage - 1;
    updateCarouselPagination();
    updateCarouselPosition(true);

    clearTimeout(carouselTransitionTimeout);
    carouselTransitionTimeout = setTimeout(() => {
        if (carouselIsTransitioning) {
            carouselIsTransitioning = false;
            if (carouselTrackIndex < CLONE_COUNT) {
                carouselTrackIndex = carouselTrackIndex + TOTAL_PACKAGES;
                updateCarouselPosition(false);
            }
        }
    }, 550);
}

function goToPackage(pkgNum) {
    if (carouselIsTransitioning) return;
    if (pkgNum < 1 || pkgNum > TOTAL_PACKAGES) return;
    carouselIsTransitioning = true;
    carouselCurrentPackage = pkgNum;
    carouselTrackIndex = (pkgNum - 1) + CLONE_COUNT;
    updateCarouselPagination();
    updateCarouselPosition(true);

    clearTimeout(carouselTransitionTimeout);
    carouselTransitionTimeout = setTimeout(() => {
        carouselIsTransitioning = false;
    }, 550);
}

function setOptionsPage(pkgNum) {
    goToPackage(pkgNum);
}

// RECOMMENDATION WIZARD STATE
const wizardState = {
    step: 1,
    bill: '₱5,000–₱8,000',
    timeUsage: 'day',
    priority: 'balanced'
};

// MODAL HELPERS
function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
        modal.classList.remove('opacity-0');
    });
    lucide.createIcons();
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    if (typeof window.closeAllCustomDropdowns === 'function') {
        window.closeAllCustomDropdowns();
    }
    modal.classList.add('opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 200);
}

// Close modal on escape key or backdrop click
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        ['recommendationModal', 'productDetailModal', 'inquiryModal'].forEach(closeModal);
    }
});

['recommendationModal', 'productDetailModal', 'inquiryModal'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('click', (e) => {
            if (e.target === el) closeModal(id);
        });
    }
});

// RENDER RECOMMENDATION WIZARD
function renderWizard() {
    const container = document.getElementById('wizardContainer');
    if (!container) return;

    if (wizardState.step === 1) {
        container.innerHTML = `
            <div class="space-y-6">
                <!-- Progress Header -->
                <div class="space-y-3">
                    <div class="flex items-center gap-2.5 pr-14 flex-wrap">
                        <span class="text-[11px] font-black text-amber-700 uppercase tracking-wider">Step 1 of 3 &bull; Electric Bill</span>
                        <span class="text-[11px] font-semibold text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded-full border border-stone-200">~30 sec match</span>
                    </div>
                    <!-- 3-Step Visual Progress Track -->
                    <div class="w-full bg-stone-200/70 h-1.5 rounded-full overflow-hidden">
                        <div class="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-300 w-1/3"></div>
                    </div>
                    <div class="pt-1">
                        <h3 class="text-2xl sm:text-3xl font-black text-[#1C1917] tracking-tight">What is your average monthly electric bill?</h3>
                        <p class="text-xs sm:text-sm text-stone-500 font-semibold mt-1">This helps us size the solar capacity required to offset your consumption.</p>
                    </div>
                </div>

                <!-- Bill Options Cards -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5 pt-1" role="radiogroup">
                    <button type="button" role="radio" aria-checked="${wizardState.bill === '₱3,000–₱5,000'}"
                        onclick="selectWizardCard('bill', '₱3,000–₱5,000', 2, this)"
                        class="wizard-card min-h-[80px] p-3.5 sm:p-4 rounded-2xl border-2 text-left transition-all duration-200 flex flex-col justify-between relative group cursor-pointer ${wizardState.bill === '₱3,000–₱5,000' ? 'border-amber-500 bg-amber-50/60 shadow-sm ring-1 ring-amber-500/30' : 'border-[#E5E0D8] hover:border-amber-400 bg-white shadow-2xs'}">
                        <div class="flex items-center justify-between gap-1.5">
                            <span class="text-[15px] sm:text-base lg:text-[17px] font-black tracking-tight text-[#1C1917] whitespace-nowrap shrink-0">₱3,000&nbsp;&ndash;&nbsp;₱5,000</span>
                            <span class="w-5 h-5 shrink-0 rounded-full border border-stone-300 flex items-center justify-center text-xs checkmark-circle ${wizardState.bill === '₱3,000–₱5,000' ? 'bg-amber-500 border-amber-500 text-white font-bold' : 'text-transparent'}">✓</span>
                        </div>
                        <div class="text-[11px] sm:text-xs font-semibold text-stone-500 mt-2 flex items-center gap-1.5">
                            <span>1–2 ACs</span>
                            <span class="text-stone-300">&bull;</span>
                            <span>Starter home</span>
                        </div>
                    </button>

                    <button type="button" role="radio" aria-checked="${wizardState.bill === '₱5,000–₱8,000'}"
                        onclick="selectWizardCard('bill', '₱5,000–₱8,000', 2, this)"
                        class="wizard-card min-h-[80px] p-3.5 sm:p-4 rounded-2xl border-2 text-left transition-all duration-200 flex flex-col justify-between relative group cursor-pointer ${wizardState.bill === '₱5,000–₱8,000' ? 'border-amber-500 bg-amber-50/60 shadow-sm ring-1 ring-amber-500/30' : 'border-[#E5E0D8] hover:border-amber-400 bg-white shadow-2xs'}">
                        <div class="flex items-center justify-between gap-1.5">
                            <span class="text-[15px] sm:text-base lg:text-[17px] font-black tracking-tight text-[#1C1917] whitespace-nowrap shrink-0">₱5,000&nbsp;&ndash;&nbsp;₱8,000</span>
                            <span class="w-5 h-5 shrink-0 rounded-full border border-stone-300 flex items-center justify-center text-xs checkmark-circle ${wizardState.bill === '₱5,000–₱8,000' ? 'bg-amber-500 border-amber-500 text-white font-bold' : 'text-transparent'}">✓</span>
                        </div>
                        <div class="text-[11px] sm:text-xs font-semibold text-stone-500 mt-2 flex items-center gap-1.5">
                            <span class="text-amber-700 font-bold">⭐ Most Common</span>
                            <span class="text-stone-300">&bull;</span>
                            <span>2–3 ACs</span>
                        </div>
                    </button>

                    <button type="button" role="radio" aria-checked="${wizardState.bill === '₱8,000–₱12,000'}"
                        onclick="selectWizardCard('bill', '₱8,000–₱12,000', 2, this)"
                        class="wizard-card min-h-[80px] p-3.5 sm:p-4 rounded-2xl border-2 text-left transition-all duration-200 flex flex-col justify-between relative group cursor-pointer ${wizardState.bill === '₱8,000–₱12,000' ? 'border-amber-500 bg-amber-50/60 shadow-sm ring-1 ring-amber-500/30' : 'border-[#E5E0D8] hover:border-amber-400 bg-white shadow-2xs'}">
                        <div class="flex items-center justify-between gap-1.5">
                            <span class="text-[15px] sm:text-base lg:text-[17px] font-black tracking-tight text-[#1C1917] whitespace-nowrap shrink-0">₱8,000&nbsp;&ndash;&nbsp;₱12,000</span>
                            <span class="w-5 h-5 shrink-0 rounded-full border border-stone-300 flex items-center justify-center text-xs checkmark-circle ${wizardState.bill === '₱8,000–₱12,000' ? 'bg-amber-500 border-amber-500 text-white font-bold' : 'text-transparent'}">✓</span>
                        </div>
                        <div class="text-[11px] sm:text-xs font-semibold text-stone-500 mt-2 flex items-center gap-1.5">
                            <span>3–4 ACs</span>
                            <span class="text-stone-300">&bull;</span>
                            <span>High usage</span>
                        </div>
                    </button>

                    <button type="button" role="radio" aria-checked="${wizardState.bill === '₱12,000+'}"
                        onclick="selectWizardCard('bill', '₱12,000+', 2, this)"
                        class="wizard-card min-h-[80px] p-3.5 sm:p-4 rounded-2xl border-2 text-left transition-all duration-200 flex flex-col justify-between relative group cursor-pointer ${wizardState.bill === '₱12,000+' ? 'border-amber-500 bg-amber-50/60 shadow-sm ring-1 ring-amber-500/30' : 'border-[#E5E0D8] hover:border-amber-400 bg-white shadow-2xs'}">
                        <div class="flex items-center justify-between gap-1.5">
                            <span class="text-[15px] sm:text-base lg:text-[17px] font-black tracking-tight text-[#1C1917] whitespace-nowrap shrink-0">₱12,000+</span>
                            <span class="w-5 h-5 shrink-0 rounded-full border border-stone-300 flex items-center justify-center text-xs checkmark-circle ${wizardState.bill === '₱12,000+' ? 'bg-amber-500 border-amber-500 text-white font-bold' : 'text-transparent'}">✓</span>
                        </div>
                        <div class="text-[11px] sm:text-xs font-semibold text-stone-500 mt-2 flex items-center gap-1.5">
                            <span>4+ ACs</span>
                            <span class="text-stone-300">&bull;</span>
                            <span>Estate / Commercial</span>
                        </div>
                    </button>
                </div>
            </div>
        `;
    } else if (wizardState.step === 2) {
        container.innerHTML = `
            <div class="space-y-6">
                <!-- Progress Header -->
                <div class="space-y-3">
                    <div class="flex items-center gap-2.5 pr-14">
                        <button onclick="wizardState.step = 1; renderWizard();" class="text-xs font-bold text-stone-600 hover:text-[#1C1917] flex items-center gap-1 transition bg-stone-100 hover:bg-amber-100/60 px-2.5 py-1 rounded-lg cursor-pointer">
                            &larr; Back
                        </button>
                        <span class="text-[11px] font-black text-amber-700 uppercase tracking-wider">Step 2 of 3 &bull; Power Habits</span>
                    </div>
                    <!-- Progress Track -->
                    <div class="w-full bg-stone-200/70 h-1.5 rounded-full overflow-hidden">
                        <div class="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-300 w-2/3"></div>
                    </div>
                    <div class="pt-1">
                        <h3 class="text-2xl sm:text-3xl font-black text-[#1C1917] tracking-tight">When does your home use the most power?</h3>
                        <p class="text-xs sm:text-sm text-stone-500 font-semibold mt-1">Determines if you need higher daytime solar output or larger battery storage.</p>
                    </div>
                </div>

                <!-- Power Usage Cards -->
                <div class="space-y-3 pt-1" role="radiogroup">
                    <button type="button" role="radio" aria-checked="${wizardState.timeUsage === 'day'}"
                        onclick="selectWizardCard('timeUsage', 'day', 3, this)"
                        class="wizard-card w-full p-3 sm:p-4 rounded-2xl border-2 text-left transition-all duration-200 flex items-center justify-between cursor-pointer ${wizardState.timeUsage === 'day' ? 'border-amber-500 bg-amber-50/60 shadow-sm ring-1 ring-amber-500/30' : 'border-[#E5E0D8] hover:border-amber-400 bg-white'}">
                        <div class="min-w-0 pr-2">
                            <div class="text-[13px] sm:text-base font-black text-[#1C1917] flex items-center gap-1.5 whitespace-nowrap">
                                <span class="whitespace-nowrap shrink-0">☀️ Daytime Heavy</span>
                            </div>
                            <div class="text-[11px] sm:text-xs text-stone-500 font-semibold mt-1 truncate">WFH, daytime ACs & appliances</div>
                        </div>
                        <span class="w-5 h-5 rounded-full border border-stone-300 shrink-0 ml-2 flex items-center justify-center text-xs checkmark-circle ${wizardState.timeUsage === 'day' ? 'bg-amber-500 border-amber-500 text-white font-bold' : 'text-transparent'}">✓</span>
                    </button>

                    <button type="button" role="radio" aria-checked="${wizardState.timeUsage === 'night'}"
                        onclick="selectWizardCard('timeUsage', 'night', 3, this)"
                        class="wizard-card w-full p-3 sm:p-4 rounded-2xl border-2 text-left transition-all duration-200 flex items-center justify-between cursor-pointer ${wizardState.timeUsage === 'night' ? 'border-amber-500 bg-amber-50/60 shadow-sm ring-1 ring-amber-500/30' : 'border-[#E5E0D8] hover:border-amber-400 bg-white'}">
                        <div class="min-w-0 pr-2">
                            <div class="text-[13px] sm:text-base font-black text-[#1C1917] flex items-center gap-1.5 whitespace-nowrap">
                                <span class="whitespace-nowrap shrink-0">🌙 Evening & Night</span>
                                <span class="text-[9.5px] sm:text-[10px] font-black text-amber-700 bg-amber-100/90 px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0">⭐ Most Common</span>
                            </div>
                            <div class="text-[11px] sm:text-xs text-stone-500 font-semibold mt-1 truncate">Night ACs & evening home use</div>
                        </div>
                        <span class="w-5 h-5 rounded-full border border-stone-300 shrink-0 ml-2 flex items-center justify-center text-xs checkmark-circle ${wizardState.timeUsage === 'night' ? 'bg-amber-500 border-amber-500 text-white font-bold' : 'text-transparent'}">✓</span>
                    </button>

                    <button type="button" role="radio" aria-checked="${wizardState.timeUsage === 'balanced'}"
                        onclick="selectWizardCard('timeUsage', 'balanced', 3, this)"
                        class="wizard-card w-full p-3 sm:p-4 rounded-2xl border-2 text-left transition-all duration-200 flex items-center justify-between cursor-pointer ${wizardState.timeUsage === 'balanced' ? 'border-amber-500 bg-amber-50/60 shadow-sm ring-1 ring-amber-500/30' : 'border-[#E5E0D8] hover:border-amber-400 bg-white'}">
                        <div class="min-w-0 pr-2">
                            <div class="text-[13px] sm:text-base font-black text-[#1C1917] flex items-center gap-1.5 whitespace-nowrap">
                                <span class="whitespace-nowrap shrink-0">⚡ Balanced 24/7 Steady</span>
                            </div>
                            <div class="text-[11px] sm:text-xs text-stone-500 font-semibold mt-1 truncate">Steady high power use day & night</div>
                        </div>
                        <span class="w-5 h-5 rounded-full border border-stone-300 shrink-0 ml-2 flex items-center justify-center text-xs checkmark-circle ${wizardState.timeUsage === 'balanced' ? 'bg-amber-500 border-amber-500 text-white font-bold' : 'text-transparent'}">✓</span>
                    </button>
                </div>
            </div>
        `;
    } else if (wizardState.step === 3) {
        container.innerHTML = `
            <div class="space-y-6">
                <!-- Progress Header -->
                <div class="space-y-3">
                    <div class="flex items-center gap-2.5 pr-14">
                        <button onclick="wizardState.step = 2; renderWizard();" class="text-xs font-bold text-stone-600 hover:text-[#1C1917] flex items-center gap-1 transition bg-stone-100 hover:bg-amber-100/60 px-2.5 py-1 rounded-lg cursor-pointer">
                            &larr; Back
                        </button>
                        <span class="text-[11px] font-black text-amber-700 uppercase tracking-wider">Step 3 of 3 &bull; Primary Goal</span>
                    </div>
                    <!-- Progress Track -->
                    <div class="w-full bg-stone-200/70 h-1.5 rounded-full overflow-hidden">
                        <div class="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-300 w-full"></div>
                    </div>
                    <div class="pt-1">
                        <h3 class="text-2xl sm:text-3xl font-black text-[#1C1917] tracking-tight">What is your primary goal with solar?</h3>
                        <p class="text-xs sm:text-sm text-stone-500 font-semibold mt-1">We customize your proposal to deliver exactly what matters most.</p>
                    </div>
                </div>

                <!-- Goal Cards -->
                <div class="space-y-3 pt-1" role="radiogroup">
                    <button type="button" role="radio" aria-checked="${wizardState.priority === 'savings'}"
                        onclick="selectWizardCard('priority', 'savings', 4, this)"
                        class="wizard-card w-full p-3 sm:p-4 rounded-2xl border-2 text-left transition-all duration-200 flex items-center justify-between cursor-pointer ${wizardState.priority === 'savings' ? 'border-amber-500 bg-amber-50/60 shadow-sm ring-1 ring-amber-500/30' : 'border-[#E5E0D8] hover:border-amber-400 bg-white'}">
                        <div class="min-w-0 pr-2">
                            <div class="text-[13px] sm:text-base font-black text-[#1C1917] flex items-center gap-1.5 whitespace-nowrap">
                                <span class="whitespace-nowrap shrink-0">💰 Maximum Bill Savings</span>
                            </div>
                            <div class="text-[11px] sm:text-xs text-stone-500 font-semibold mt-1 truncate">Fastest ROI to cut monthly power bills</div>
                        </div>
                        <span class="w-5 h-5 rounded-full border border-stone-300 shrink-0 ml-2 flex items-center justify-center text-xs checkmark-circle ${wizardState.priority === 'savings' ? 'bg-amber-500 border-amber-500 text-white font-bold' : 'text-transparent'}">✓</span>
                    </button>

                    <button type="button" role="radio" aria-checked="${wizardState.priority === 'maximum'}"
                        onclick="selectWizardCard('priority', 'maximum', 4, this)"
                        class="wizard-card w-full p-3 sm:p-4 rounded-2xl border-2 text-left transition-all duration-200 flex items-center justify-between cursor-pointer ${wizardState.priority === 'maximum' ? 'border-amber-500 bg-amber-50/60 shadow-sm ring-1 ring-amber-500/30' : 'border-[#E5E0D8] hover:border-amber-400 bg-white'}">
                        <div class="min-w-0 pr-2">
                            <div class="text-[13px] sm:text-base font-black text-[#1C1917] flex items-center gap-1.5 whitespace-nowrap">
                                <span class="whitespace-nowrap shrink-0">🔋 Outage Protection</span>
                                <span class="text-[9.5px] sm:text-[10px] font-black text-amber-700 bg-amber-100/90 px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0">⭐ Most Common</span>
                            </div>
                            <div class="text-[11px] sm:text-xs text-stone-500 font-semibold mt-1 truncate">Keep ACs, fridge, lights & Wi-Fi on</div>
                        </div>
                        <span class="w-5 h-5 rounded-full border border-stone-300 shrink-0 ml-2 flex items-center justify-center text-xs checkmark-circle ${wizardState.priority === 'maximum' ? 'bg-amber-500 border-amber-500 text-white font-bold' : 'text-transparent'}">✓</span>
                    </button>

                    <button type="button" role="radio" aria-checked="${wizardState.priority === 'essential'}"
                        onclick="selectWizardCard('priority', 'essential', 4, this)"
                        class="wizard-card w-full p-3 sm:p-4 rounded-2xl border-2 text-left transition-all duration-200 flex items-center justify-between cursor-pointer ${wizardState.priority === 'essential' ? 'border-amber-500 bg-amber-50/60 shadow-sm ring-1 ring-amber-500/30' : 'border-[#E5E0D8] hover:border-amber-400 bg-white'}">
                        <div class="min-w-0 pr-2">
                            <div class="text-[13px] sm:text-base font-black text-[#1C1917] flex items-center gap-1.5 whitespace-nowrap">
                                <span class="whitespace-nowrap shrink-0">🌿 Future-Proof Clean Energy</span>
                            </div>
                            <div class="text-[11px] sm:text-xs text-stone-500 font-semibold mt-1 truncate">Energy independence & 100% clean power</div>
                        </div>
                        <span class="w-5 h-5 rounded-full border border-stone-300 shrink-0 ml-2 flex items-center justify-center text-xs checkmark-circle ${wizardState.priority === 'essential' ? 'bg-amber-500 border-amber-500 text-white font-bold' : 'text-transparent'}">✓</span>
                    </button>
                </div>
            </div>
        `;
    } else if (wizardState.step === 4) {
        // Determine recommendation
        let recommendedId = 'hs6-lite';
        if (wizardState.bill === '₱12,000+' || wizardState.bill === '₱8,000–₱12,000') {
            recommendedId = 'hs8-pro';
        } else if (wizardState.bill === '₱5,000–₱8,000') {
            recommendedId = (wizardState.priority === 'maximum' || wizardState.timeUsage === 'night') ? 'hs6-pro' : 'hs6-lite';
        } else {
            recommendedId = 'hs6-lite';
        }

        const rec = PRODUCTS[recommendedId];

        container.innerHTML = `
            <div class="space-y-6">
                <!-- Result Eyebrow & Title -->
                <div class="text-center space-y-1.5">
                    <span class="inline-block bg-amber-500/10 text-amber-700 border border-amber-500/20 text-[11px] font-black px-3.5 py-1 rounded-full uppercase tracking-wider">
                        ⭐ Your Tailored Solar Match
                    </span>
                    <h3 class="text-3xl sm:text-4xl font-black text-[#1C1917] tracking-tight">${rec.name}</h3>
                    <p class="text-xs sm:text-sm text-stone-600 font-bold">${rec.tagline}</p>
                </div>

                <!-- System Specs & Estimated Savings -->
                <div class="bg-gradient-to-br from-amber-50/90 via-amber-50/50 to-orange-50/60 rounded-2xl p-5 sm:p-6 border border-amber-200/80 space-y-4 shadow-xs">
                    <div class="grid grid-cols-3 gap-2.5 text-center">
                        <div class="bg-white rounded-xl p-3 border border-amber-200/70 shadow-2xs">
                            <div class="text-[10px] font-black text-stone-500 uppercase tracking-wider">Solar Panels</div>
                            <div class="text-sm sm:text-base font-black text-[#1C1917] mt-0.5">${rec.panels}</div>
                        </div>
                        <div class="bg-white rounded-xl p-3 border border-amber-200/70 shadow-2xs">
                            <div class="text-[10px] font-black text-stone-500 uppercase tracking-wider">Inverter</div>
                            <div class="text-sm sm:text-base font-black text-[#1C1917] mt-0.5">${rec.inverter}</div>
                        </div>
                        <div class="bg-white rounded-xl p-3 border border-amber-200/70 shadow-2xs">
                            <div class="text-[10px] font-black text-stone-500 uppercase tracking-wider">Battery Storage</div>
                            <div class="text-sm sm:text-base font-black text-[#1C1917] mt-0.5">${rec.battery}</div>
                        </div>
                    </div>

                    <!-- Financial Breakdown -->
                    <div class="pt-3 grid grid-cols-2 gap-3 border-t border-amber-200/70">
                        <div>
                            <div class="text-[10px] font-black uppercase tracking-wider text-stone-500">Full Payment</div>
                            <div class="text-base sm:text-lg font-black text-[#1C1917]">${rec.cashPrice}</div>
                            <div class="text-[10px] font-bold text-stone-500">One-time</div>
                        </div>
                        <div class="text-right">
                            <div class="text-[10px] font-black uppercase tracking-wider text-stone-500">Installment</div>
                            <div class="text-base sm:text-lg font-black text-amber-700">${rec.monthly} <span class="text-xs font-bold text-stone-500">/mo</span></div>
                            <div class="text-[10px] font-bold text-stone-500">5 yrs · ₱10k DP</div>
                        </div>
                    </div>
                    <div class="text-xs font-bold text-emerald-700">Est. bill savings: ${rec.estSavings}/mo</div>
                </div>

                <!-- Why We Recommend It -->
                <div class="bg-stone-50/90 border border-[#E5E0D8] rounded-2xl p-4 sm:p-5 space-y-2">
                    <h4 class="text-xs font-black text-[#1C1917] uppercase tracking-wider">Why we recommend this system:</h4>
                    <ul class="space-y-1.5 text-xs text-stone-600 font-semibold">
                        <li class="flex items-start gap-2">
                            <span class="text-emerald-600 font-black mt-0.5">✓</span>
                            <span>Precision-sized to offset your estimated <strong>${wizardState.bill}</strong> monthly electricity bill.</span>
                        </li>
                        <li class="flex items-start gap-2">
                            <span class="text-emerald-600 font-black mt-0.5">✓</span>
                            <span>High-efficiency LiFePO4 battery storage engineered for your <strong>${wizardState.timeUsage === 'night' ? 'Evening & Night' : (wizardState.timeUsage === 'day' ? 'Daytime' : '24/7 Steady')}</strong> usage pattern.</span>
                        </li>
                        <li class="flex items-start gap-2">
                            <span class="text-emerald-600 font-black mt-0.5">✓</span>
                            <span>Automatic switchover ensures dependable power protection during grid brownouts.</span>
                        </li>
                    </ul>
                </div>

                <!-- Action Buttons -->
                <div class="space-y-2.5 pt-1">
                    <button onclick="startInquiry('${rec.id}')"
                        class="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold py-4 px-6 rounded-full flex items-center justify-center gap-2 transition text-xs sm:text-sm shadow-sm hover:shadow-md active:scale-98 cursor-pointer">
                        Request ${rec.name} Assessment &rarr;
                    </button>
                    <button onclick="viewProductDetails('${rec.id}')"
                        class="w-full border border-stone-300 hover:bg-amber-50/50 text-stone-700 font-extrabold py-3 px-4 rounded-xl text-xs transition cursor-pointer">
                        View Technical Specifications
                    </button>
                    <button onclick="wizardState.step = 1; renderWizard();"
                        class="w-full text-center text-xs font-bold text-stone-400 hover:text-stone-700 py-1 transition flex items-center justify-center gap-1 cursor-pointer">
                        &larr; Change Answers / Start Over
                    </button>
                </div>
            </div>
        `;
    }

    lucide.createIcons();
}

function selectWizardCard(key, val, nextStep, element) {
    wizardState[key] = val;

    // Visual feedback on click
    if (element) {
        const parent = element.parentElement;
        if (parent) {
            parent.querySelectorAll('.wizard-card').forEach(card => {
                card.className = card.className.replace('border-amber-500 bg-amber-50/60 shadow-sm ring-1 ring-amber-500/30', 'border-[#E5E0D8] bg-white');
                const checkmark = card.querySelector('.checkmark-circle');
                if (checkmark) {
                    checkmark.className = 'w-5 h-5 rounded-full border border-stone-300 flex items-center justify-center text-xs checkmark-circle text-transparent';
                }
            });
        }
        element.className = element.className.replace('border-[#E5E0D8] bg-white', 'border-amber-500 bg-amber-50/60 shadow-sm ring-1 ring-amber-500/30');
        const activeCheck = element.querySelector('.checkmark-circle');
        if (activeCheck) {
            activeCheck.className = 'w-5 h-5 rounded-full border border-amber-500 bg-amber-500 text-white font-bold flex items-center justify-center text-xs checkmark-circle';
        }
    }

    // Smoothly advance after 240ms so selection is clearly confirmed
    setTimeout(() => {
        wizardState.step = nextStep;
        renderWizard();
    }, 240);
}

// PRODUCT DETAILS VIEW
function viewProductDetails(productId) {
    closeModal('recommendationModal');
    const product = PRODUCTS[productId] || PRODUCTS['hs6-lite'];
    const container = document.getElementById('productDetailContent');
    if (!container) return;

    container.innerHTML = `
        <div class="space-y-3.5 sm:space-y-4">
            <div class="space-y-0.5 pr-8">
                <span class="inline-block bg-amber-500/10 text-amber-700 text-[10px] 2xl:text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    ${product.tag || 'SPECIFICATIONS'}
                </span>
                <h3 class="text-2xl sm:text-3xl font-black text-[#1C1917] tracking-tight">${product.name}</h3>
                <p class="text-xs sm:text-sm text-stone-500 font-semibold">${product.tagline}</p>
            </div>

            <!-- Specs Row -->
            <div class="grid grid-cols-3 gap-2 sm:gap-2.5 text-center">
                <div class="border border-amber-200/60 rounded-xl sm:rounded-2xl p-2 sm:p-2.5 bg-amber-50/30">
                    <div class="text-[10px] sm:text-xs font-bold text-stone-500 uppercase tracking-tight">Solar Panels</div>
                    <div class="text-sm sm:text-base font-black text-[#1C1917] mt-0.5">${product.panels}</div>
                </div>
                <div class="border border-amber-200/60 rounded-xl sm:rounded-2xl p-2 sm:p-2.5 bg-amber-50/30">
                    <div class="text-[10px] sm:text-xs font-bold text-stone-500 uppercase tracking-tight">Inverter</div>
                    <div class="text-sm sm:text-base font-black text-[#1C1917] mt-0.5">${product.inverter}</div>
                </div>
                <div class="border border-amber-200/60 rounded-xl sm:rounded-2xl p-2 sm:p-2.5 bg-amber-50/30">
                    <div class="text-[10px] sm:text-xs font-bold text-stone-500 uppercase tracking-tight">Battery Storage</div>
                    <div class="text-sm sm:text-base font-black text-[#1C1917] mt-0.5">${product.battery}</div>
                </div>
            </div>

            <!-- Pricing Summary -->
            <div class="grid grid-cols-2 gap-2 sm:gap-2.5">
                <div class="bg-white border border-[#E5E0D8] rounded-xl sm:rounded-2xl p-3 sm:p-4">
                    <div class="text-[10px] sm:text-[11px] font-black text-stone-500 uppercase tracking-wider">Full Payment</div>
                    <div class="text-lg sm:text-xl font-black text-[#1C1917] mt-0.5">${product.cashPrice}</div>
                    <div class="text-[10px] sm:text-[11px] font-bold text-stone-500">One-time payment</div>
                </div>
                <div class="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-200/70 rounded-xl sm:rounded-2xl p-3 sm:p-4">
                    <div class="text-[10px] sm:text-[11px] font-black text-stone-500 uppercase tracking-wider">Installment</div>
                    <div class="text-lg sm:text-xl font-black text-amber-600 mt-0.5">${product.monthly}<span class="text-xs font-bold text-stone-500">/mo</span></div>
                    <div class="text-[10px] sm:text-[11px] font-bold text-stone-500">5 yrs · ₱10k down payment</div>
                </div>
            </div>
            <div class="text-[11px] sm:text-xs font-bold text-emerald-700 -mt-1">Est. bill savings: ${product.estSavings}/mo</div>

            <!-- Inclusions List -->
            <div class="space-y-1.5 sm:space-y-2">
                <div class="text-[11px] sm:text-xs font-black text-stone-800 uppercase tracking-wider">Package Inclusions</div>
                <div class="space-y-1 sm:space-y-1.5">
                    ${product.features.map(f => `
                        <div class="flex items-start gap-2 text-xs sm:text-[13px] font-semibold text-stone-700 leading-snug">
                            <i data-lucide="check-circle" class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0 mt-0.5 stroke-[2.5]"></i>
                            <span>${f}</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Action Buttons -->
            <div class="pt-1">
                <button onclick="startInquiry('${product.id}')" class="w-full h-12 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold px-4 rounded-xl flex items-center justify-center gap-2 transition text-sm shadow-sm hover:shadow cursor-pointer">
                    Request ${product.name} Assessment &rarr;
                </button>
            </div>
        </div>
    `;

    openModal('productDetailModal');
}

// START INQUIRY
function startInquiry(productId) {
    closeModal('recommendationModal');
    closeModal('productDetailModal');

    // Reset form view
    const form = document.getElementById('leadForm');
    const successScreen = document.getElementById('leadSuccessScreen');
    if (form) form.classList.remove('hidden');
    if (successScreen) successScreen.classList.add('hidden');
    document.getElementById('leadFormHeader')?.classList.remove('hidden');
    clearLeadErrors();

    // Sync package dropdown
    if (productId) {
        setCustomDropdownValue('leadPackage', productId);
    }

    // Sync bill dropdown
    if (wizardState.bill) {
        setCustomDropdownValue('leadBill', wizardState.bill);
    }

    // Sync payment dropdown
    const paymentInput = document.getElementById('leadPayment');
    if (paymentInput && paymentInput.value) {
        setLeadPayment(paymentInput.value);
    }
    renderPaymentOptions();

    openModal('inquiryModal');
}

// CUSTOM DROPDOWN ENGINE
// Maps trigger label text for package options
const PKG_LABELS = {
    'hs6-lite': 'HS 6 LITE \u2014 4.96kW | 6kW | 4.8kWh',
    'hs6-pro': 'HS 6 PRO \u2014 6.2kW | 6kW | 9.6kWh',
    'hs6-max': 'HS 6 MAX \u2014 8.27kW | 8kW | 9.6kWh',
    'hs8-pro': 'HS 8 PRO \u2014 8kW | 8kW | 16kWh',
    'hs8-max': 'HS 8 MAX \u2014 8kW | 12kW | 32kWh',
    'hs10-pro': 'HS 10 PRO \u2014 10kW | 12kW | 16kWh',
    'hs12-max': 'HS 12 MAX \u2014 12kW | 16kW | 32kWh'
};

function setCustomDropdownValue(inputId, value) {
    const hiddenInput = document.getElementById(inputId);
    if (!hiddenInput) return;
    hiddenInput.value = value;

    if (inputId === 'leadPayment') {
        setLeadPayment(value);
        return;
    }

    const dropdown = document.querySelector(`.hs-dropdown[data-dropdown="${inputId}"]`);
    if (!dropdown) return;

    const trigger = dropdown.querySelector('.hs-dropdown-trigger');
    const labelEl = trigger ? trigger.querySelector('.hs-dd-label') : null;
    const options = dropdown.querySelectorAll('.hs-dropdown-option');
    // Wizard values use "₱5,000–₱8,000" while the form uses "₱5,000 – ₱8,000": compare without spaces
    const norm = v => String(v || '').replace(/\s+/g, '');

    options.forEach(opt => {
        const optVal = opt.getAttribute('data-value');
        if (norm(optVal) === norm(value)) {
            hiddenInput.value = optVal;
            opt.classList.add('is-active');
            if (labelEl) {
                // Use data-label if available, else build from opt content
                const customLabel = opt.getAttribute('data-label');
                if (customLabel) {
                    labelEl.textContent = customLabel;
                } else if (inputId === 'leadPackage' && PKG_LABELS[value]) {
                    labelEl.textContent = PKG_LABELS[value];
                } else {
                    const mainText = opt.querySelector('.hs-dd-opt-main');
                    labelEl.textContent = mainText ? mainText.textContent : value;
                }
            }
        } else {
            opt.classList.remove('is-active');
        }
    });

    if (inputId === 'leadPackage') renderPaymentOptions();
}

// PAYMENT TYPE (Full Payment vs Installment) — stored in #leadPayment as "Full Payment" / "Installment"
function setLeadPayment(value) {
    const input = document.getElementById('leadPayment');
    const val = value === 'Installment' ? 'Installment' : 'Full Payment';
    if (input) input.value = val;
    document.querySelectorAll('#leadPaymentOptions .pay-option').forEach(btn => {
        const active = btn.getAttribute('data-payment') === val;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-checked', active ? 'true' : 'false');
        btn.tabIndex = active ? 0 : -1;
    });
    renderSubmitLabel();
}

// Main button label follows the payment type and the selected package price (label only)
function getSubmitLabelHTML() {
    const payInput = document.getElementById('leadPayment');
    if (payInput && payInput.value === 'Installment') {
        return `<span>Start Installment</span> &rarr;`;
    }
    const pkgInput = document.getElementById('leadPackage');
    const product = PRODUCTS[pkgInput && pkgInput.value] || PRODUCTS['hs6-lite'];
    return `<span>Pay Now — ${product.cashPrice}</span> &rarr;`;
}

function renderSubmitLabel() {
    const btn = document.getElementById('submitLeadBtn');
    if (btn && !btn.disabled) btn.innerHTML = getSubmitLabelHTML();
}

// Show the selected package's full-payment and installment prices on the payment cards
function renderPaymentOptions() {
    const pkgInput = document.getElementById('leadPackage');
    const product = PRODUCTS[pkgInput && pkgInput.value] || PRODUCTS['hs6-lite'];
    const full = document.querySelector('[data-pay-price="full"]');
    const inst = document.querySelector('[data-pay-price="installment"]');
    if (full) full.textContent = product.cashPrice;
    if (inst) inst.innerHTML = `${product.monthly}<small>/mo</small>`;
    renderSubmitLabel();
}

function initPaymentOptions() {
    const group = document.getElementById('leadPaymentOptions');
    if (!group) return;
    group.addEventListener('click', (e) => {
        const btn = e.target.closest('.pay-option');
        if (!btn) return;
        setLeadPayment(btn.getAttribute('data-payment'));
    });
    group.addEventListener('keydown', (e) => {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
        e.preventDefault();
        const current = document.getElementById('leadPayment').value;
        const next = current === 'Installment' ? 'Full Payment' : 'Installment';
        setLeadPayment(next);
        const btn = group.querySelector(`[data-payment="${next}"]`);
        if (btn) btn.focus();
    });
    setLeadPayment(document.getElementById('leadPayment').value);
    renderPaymentOptions();
}

function initCustomDropdowns() {
    const dropdowns = document.querySelectorAll('.hs-dropdown');
    const portalState = new Map();
    const closeTimers = new Map();

    function closeAllDropdowns() {
        dropdowns.forEach(dd => {
            const trigger = dd.querySelector('.hs-dropdown-trigger');
            if (trigger) {
                trigger.classList.remove('is-open');
                trigger.setAttribute('aria-expanded', 'false');
            }

            // Return portaled elements
            const state = portalState.get(dd);
            if (state) {
                const { panel, overlay, originalParent } = state;
                if (panel) panel.classList.remove('is-visible');
                if (overlay) overlay.classList.remove('is-visible');

                // Clear any previous timer
                if (closeTimers.has(dd)) {
                    clearTimeout(closeTimers.get(dd));
                }

                const timerId = setTimeout(() => {
                    if (panel && panel.parentElement === document.body) {
                        originalParent.appendChild(panel);
                    }
                    if (overlay && overlay.parentElement === document.body) {
                        originalParent.appendChild(overlay);
                    }
                    portalState.delete(dd);
                    closeTimers.delete(dd);
                }, 280);

                closeTimers.set(dd, timerId);
            } else {
                // Desktop floating dropdown
                const panel = dd.querySelector('.hs-dropdown-panel');
                const overlay = dd.querySelector('.hs-dropdown-overlay');
                if (panel) panel.classList.remove('is-visible');
                if (overlay) overlay.classList.remove('is-visible');
            }
        });
        document.body.style.overflow = '';
    }

    // Expose globally for modal close handler
    window.closeAllCustomDropdowns = closeAllDropdowns;

    dropdowns.forEach(dd => {
        const trigger = dd.querySelector('.hs-dropdown-trigger');
        const panel = dd.querySelector('.hs-dropdown-panel');
        const overlay = dd.querySelector('.hs-dropdown-overlay');
        const sheetClose = dd.querySelector('.hs-dd-sheet-close');
        const inputId = dd.getAttribute('data-dropdown');
        const hiddenInput = inputId ? document.getElementById(inputId) : null;
        const labelEl = trigger ? trigger.querySelector('.hs-dd-label') : null;

        if (!trigger || !panel) return;

        function getOptions() {
            return panel.querySelectorAll('.hs-dropdown-option');
        }

        // Toggle open/close
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const isOpen = trigger.classList.contains('is-open');

            // If already open, close it
            if (isOpen) {
                closeAllDropdowns();
                return;
            }

            // Close any other open dropdowns first
            closeAllDropdowns();

            // Cancel any pending return timer if re-opened quickly
            if (closeTimers.has(dd)) {
                clearTimeout(closeTimers.get(dd));
                closeTimers.delete(dd);
            }

            trigger.classList.add('is-open');
            trigger.setAttribute('aria-expanded', 'true');

            const isMobile = window.innerWidth < 640;

            if (isMobile) {
                portalState.set(dd, {
                    panel: panel,
                    overlay: overlay,
                    originalParent: dd
                });

                if (overlay && overlay.parentElement !== document.body) {
                    document.body.appendChild(overlay);
                }
                if (panel.parentElement !== document.body) {
                    document.body.appendChild(panel);
                }
                document.body.style.overflow = 'hidden';

                requestAnimationFrame(() => {
                    if (overlay) overlay.classList.add('is-visible');
                    panel.classList.add('is-visible');
                });
            } else {
                panel.classList.add('is-visible');
            }
        });

        // Delegated option click (works whether inside dd or portaled to body)
        panel.addEventListener('click', (e) => {
            const opt = e.target.closest('.hs-dropdown-option');
            if (!opt) return;
            e.preventDefault();
            e.stopPropagation();

            const val = opt.getAttribute('data-value');

            // Update hidden input
            if (hiddenInput) hiddenInput.value = val;

            // Update trigger label
            if (labelEl) {
                const customLabel = opt.getAttribute('data-label');
                if (customLabel) {
                    labelEl.textContent = customLabel;
                } else if (inputId === 'leadPackage' && PKG_LABELS[val]) {
                    labelEl.textContent = PKG_LABELS[val];
                } else {
                    const mainText = opt.querySelector('.hs-dd-opt-main');
                    labelEl.textContent = mainText ? mainText.textContent : val;
                }
            }

            // Update active state
            getOptions().forEach(o => o.classList.remove('is-active'));
            opt.classList.add('is-active');
            if (inputId === 'leadPackage') renderPaymentOptions();

            // Close dropdown
            closeAllDropdowns();
        });

        // Close on overlay click (mobile)
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                e.stopPropagation();
                closeAllDropdowns();
            });
        }

        // Close on sheet close button (mobile)
        if (sheetClose) {
            sheetClose.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                closeAllDropdowns();
            });
        }
    });

    // Close dropdowns on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.hs-dropdown') && !e.target.closest('.hs-dropdown-panel') && !e.target.closest('.hs-dropdown-overlay')) {
            closeAllDropdowns();
        }
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllDropdowns();
        }
    });
}

// LEAD FORM VALIDATION (inline messages instead of browser pop-ups)
const LEAD_FIELDS = ['leadName', 'leadPhone', 'leadLocation', 'leadEmail'];

function setLeadError(id, message) {
    const input = document.getElementById(id);
    const err = document.getElementById(id + 'Error');
    if (input) {
        input.classList.toggle('is-invalid', !!message);
        input.setAttribute('aria-invalid', message ? 'true' : 'false');
    }
    if (err) {
        err.textContent = message || '';
        err.classList.toggle('hidden', !message);
    }
}

function clearLeadErrors() {
    LEAD_FIELDS.forEach(id => setLeadError(id, ''));
}

function getLeadError(id) {
    const value = (document.getElementById(id)?.value || '').trim();
    if (id === 'leadName') return value.length >= 2 ? '' : 'Please enter your full name.';
    if (id === 'leadPhone') {
        const digits = value.replace(/\D/g, '');
        if (!value) return 'Please enter your mobile number.';
        return digits.length >= 10 && digits.length <= 13 ? '' : 'Enter a valid mobile number, e.g. 0917 123 4567.';
    }
    if (id === 'leadLocation') return value ? '' : 'Please enter your city.';
    if (id === 'leadEmail') return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? '' : 'Enter a valid email address.';
    return '';
}

function validateLeadForm() {
    let firstInvalid = null;
    LEAD_FIELDS.forEach(id => {
        const msg = getLeadError(id);
        setLeadError(id, msg);
        if (msg && !firstInvalid) firstInvalid = document.getElementById(id);
    });
    if (firstInvalid) firstInvalid.focus();
    return !firstInvalid;
}

function initLeadValidation() {
    LEAD_FIELDS.forEach(id => {
        const input = document.getElementById(id);
        if (!input) return;
        // Clear the message as soon as the value becomes valid
        input.addEventListener('input', () => {
            if (input.classList.contains('is-invalid') && !getLeadError(id)) setLeadError(id, '');
        });
        input.addEventListener('blur', () => {
            if (input.value.trim()) setLeadError(id, getLeadError(id));
        });
    });
}


// Customer inquiry → Super Admin → Contact Inquiries (shared queue, imported once by id).
// Backend-ready: POST the same record to an API later.
const CUSTOMER_INQUIRY_KEY = 'HELLO_SOLAR_CUSTOMER_INQUIRIES';
// Installment terms advertised on every package: 5 years, ₱10,000 down payment
const INSTALLMENT_TERM_MONTHS = 60;
const INSTALLMENT_DOWN_PAYMENT = 10000;
function parsePeso(text) {
    const n = parseFloat(String(text || '').replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) ? n : null;
}

function queueCustomerInquiry(record) {
    // api mode (shared/hello-solar-config.js): POST /public/inquiries — the backend stores the inquiry,
    // applies the duplicate rule and assigns the final ID (shown in Super Admin → Contact Inquiries)
    if (window.HS_CONFIG && window.HS_CONFIG.isApi && window.HSApi) {
        window.HSApi.command('inquiry.submit', { inquiry: record }, { auth: false });
        return true;
    }
    try {
        const list = JSON.parse(localStorage.getItem(CUSTOMER_INQUIRY_KEY) || '[]');
        const queue = Array.isArray(list) ? list : [];
        // Duplicate guard: same id, or the same request re-sent within 2 minutes
        const fingerprint = r => [r.source, r.email, r.phone, r.package, r.paymentPreference, r.message]
            .map(v => String(v || '').trim().toLowerCase()).join('|');
        const fp = fingerprint(record);
        const now = Date.parse(record.timestamp) || Date.now();
        const duplicate = queue.some(r => r && (r.id === record.id ||
            (fingerprint(r) === fp && Math.abs(now - (Date.parse(r.timestamp) || 0)) < 120000)));
        if (duplicate) return false;
        queue.unshift(record);
        localStorage.setItem(CUSTOMER_INQUIRY_KEY, JSON.stringify(queue));
        return true;
    } catch (err) {
        console.warn('Could not queue customer inquiry:', err);
        return false;
    }
}

// HANDLE LEAD SUBMISSION
function handleLeadSubmit(e) {
    e.preventDefault();

    if (!validateLeadForm()) return;

    const submitBtn = document.getElementById('submitLeadBtn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>Sending…</span>`;
    }

    const packageId = document.getElementById('leadPackage').value;
    const name = document.getElementById('leadName').value.trim();
    const phone = document.getElementById('leadPhone').value.trim();
    const email = document.getElementById('leadEmail').value.trim();
    const location = document.getElementById('leadLocation').value.trim();
    const bill = document.getElementById('leadBill').value;
    const paymentEl = document.getElementById('leadPayment');
    const payment = paymentEl ? paymentEl.value : 'Full Payment';

    const leadData = {
        id: 'lead_' + Date.now(),
        timestamp: new Date().toISOString(),
        packageId,
        packageName: (PRODUCTS[packageId] || {}).name || packageId,
        name,
        phone,
        email,
        location,
        bill,
        payment
    };

    // Save to LocalStorage (local prototype mode only)
    if (!(window.HS_CONFIG && window.HS_CONFIG.isApi)) try {
        const existingLeads = JSON.parse(localStorage.getItem('hello_solar_leads') || '[]');
        existingLeads.push(leadData);
        localStorage.setItem('hello_solar_leads', JSON.stringify(existingLeads));
    } catch (err) {
        console.warn('LocalStorage save skipped', err);
    }

    // Also send to Super Admin → Contact Inquiries as a customer inquiry
    const pkg = PRODUCTS[packageId] || {};
    const nameParts = name.split(/\s+/);
    queueCustomerInquiry({
        id: 'INQ-' + leadData.id.replace('lead_', 'LP'),
        inquiryType: 'Customer',
        source: 'Landing Page — Request Solar Proposal',
        leadId: leadData.id,
        name,
        firstName: nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : name,
        lastName: nameParts.length > 1 ? nameParts[nameParts.length - 1] : '',
        email,
        phone,
        location,
        category: (packageId === 'hs10-pro' || packageId === 'hs12-max') ? 'Commercial Solar' : 'Residential Solar',
        packageId,
        package: PKG_LABELS[packageId] || pkg.name || packageId,
        selectedSolarModel: PKG_LABELS[packageId] || pkg.name || packageId,
        electricBill: bill,
        paymentPreference: payment,
        paymentType: payment,
        // Selected package pricing (shared application uses these exact values)
        packagePrice: parsePeso(pkg.cashPrice),
        monthlyPayment: parsePeso(pkg.monthly),
        termMonths: INSTALLMENT_TERM_MONTHS,
        downPayment: INSTALLMENT_DOWN_PAYMENT,
        subject: `${pkg.name || 'Solar'} Assessment Request`,
        message: `Requested a free site assessment for ${pkg.name || packageId} (${payment === 'Installment' ? `Installment · ${pkg.monthly}/mo, 5 yrs, ₱10k DP` : `Full Payment · ${pkg.cashPrice}`}). Monthly bill: ${bill}.`,
        status: 'Unread',
        inquiryStatus: 'Not Sent',
        customerResponse: 'Awaiting Response',
        confirmationEmailSentAt: null,
        timestamp: leadData.timestamp
    });

    setTimeout(() => {
        const form = document.getElementById('leadForm');
        const successScreen = document.getElementById('leadSuccessScreen');
        const successUser = document.getElementById('successUserName');
        const successPkg = document.getElementById('successPackageName');

        if (form) form.classList.add('hidden');
        if (successScreen) successScreen.classList.remove('hidden');
        document.getElementById('leadFormHeader')?.classList.add('hidden');
        const product = PRODUCTS[packageId] || {};
        const isInstallment = payment === 'Installment';
        const successPayType = document.getElementById('successPaymentType');
        const successPayAmount = document.getElementById('successPaymentAmount');
        const successBill = document.getElementById('successBill');
        if (successUser) successUser.textContent = name;
        if (successPkg) successPkg.textContent = product.name || packageId;
        if (successPayType) successPayType.textContent = isInstallment ? 'Installment' : 'Full Payment';
        if (successPayAmount) successPayAmount.textContent = isInstallment
            ? `${product.monthly}/mo · 5 yrs, ₱10k DP`
            : `${product.cashPrice} one-time`;
        if (successBill) successBill.textContent = bill ? `${bill} / month` : '—';

        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = getSubmitLabelHTML();
        }

        lucide.createIcons();
    }, 600);
}

// WIRE ALL EXISTING CTA AND PRODUCT BUTTONS
function initPageInteractions() {
    // 1. All "Get My Recommendation" buttons
    document.querySelectorAll('[data-action="recommend"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            wizardState.step = 1;
            renderWizard();
            openModal('recommendationModal');
        });
    });

    // 2. "Choose HS 6 Lite" button
    document.querySelectorAll('[data-action="choose"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const productId = btn.getAttribute('data-product') || 'hs6-lite';
            startInquiry(productId);
        });
    });

    // 3. Option Card Selection (Click anywhere on card or keyboard Enter/Space)
    document.querySelectorAll('[data-product-card]').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('[data-action="details"]')) return;
            const productId = card.getAttribute('data-product-card');
            if (productId) selectOption(productId);
        });

        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                if (e.target.closest('[data-action="details"]')) return;
                e.preventDefault();
                const productId = card.getAttribute('data-product-card');
                if (productId) selectOption(productId);
            }
        });
    });

    // 4. "View Details" product buttons (also selects the option)
    document.querySelectorAll('[data-action="details"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const productId = btn.getAttribute('data-product') || 'hs6-lite';
            selectOption(productId);
            viewProductDetails(productId);
        });
    });

    // 5. Slide Next (Right Arrow clicked): Navigates to next package circularly
    const nextBtn = document.getElementById('slideNextOptionBtn');
    if (nextBtn) {
        nextBtn.addEventListener('click', (e) => {
            e.preventDefault();
            nextPackage();
        });
    }

    // 6. Slide Prev (Left Arrow clicked): Navigates to previous package circularly
    const prevBtn = document.getElementById('slidePrevOptionBtn');
    if (prevBtn) {
        prevBtn.addEventListener('click', (e) => {
            e.preventDefault();
            prevPackage();
        });
    }

    // Touch Swipe support for options carousel
    const carouselViewport = document.querySelector('.options-carousel-viewport');
    if (carouselViewport) {
        let startX = 0;
        carouselViewport.addEventListener('touchstart', (e) => {
            startX = e.changedTouches[0].screenX;
        }, { passive: true });
        carouselViewport.addEventListener('touchend', (e) => {
            const endX = e.changedTouches[0].screenX;
            const diff = startX - endX;
            if (Math.abs(diff) > 40) {
                if (diff > 0) {
                    nextPackage();
                } else if (diff < 0) {
                    prevPackage();
                }
            }
        }, { passive: true });
    }

    // 7. Featured recommendation "or explore other options" note
    const featuredExploreBtn = document.getElementById('featuredExploreOptionsBtn');
    if (featuredExploreBtn) {
        featuredExploreBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const targetSec = document.getElementById('solar-systems');
            if (targetSec) {
                targetSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }

    // 8. Initial option selection UI sync & circular carousel initialization
    initCarousel();
    updateOptionsUI();
    updateCarouselPagination();

    // 8b. Custom Dropdown Components
    initCustomDropdowns();
    initPaymentOptions();
    initLeadValidation();

    // 9. Desktop Navigation Hover Underline & Active State Controller
    const desktopNav = document.getElementById('desktopNav');
    const desktopNavLinks = desktopNav ? desktopNav.querySelectorAll('a.nav-link') : [];
    let currentActiveSection = 'home';

    const activeStyles = 'text-[#1C1917] border-b-2 border-amber-500 pb-0.5 font-black nav-link transition-colors';
    const inactiveStyles = 'text-[#1C1917]/75 hover:text-[#1C1917] pb-0.5 font-bold transition-colors nav-link';

    function renderNavUnderline(activeKey) {
        desktopNavLinks.forEach(link => {
            const key = link.getAttribute('data-nav') || (link.getAttribute('href') || '').replace('#', '');
            if (key === activeKey) {
                link.className = activeStyles;
            } else {
                link.className = inactiveStyles;
            }
        });
    }

    if (desktopNav) {
        // Hover moves the underline to hovered item
        desktopNavLinks.forEach(link => {
            link.addEventListener('mouseenter', () => {
                const targetKey = link.getAttribute('data-nav') || (link.getAttribute('href') || '').replace('#', '');
                renderNavUnderline(targetKey);
            });

            link.addEventListener('click', () => {
                const targetKey = link.getAttribute('data-nav') || (link.getAttribute('href') || '').replace('#', '');
                currentActiveSection = targetKey;
                renderNavUnderline(currentActiveSection);
            });
        });

        // Mouse leaving nav restores the true active section underline
        desktopNav.addEventListener('mouseleave', () => {
            renderNavUnderline(currentActiveSection);
        });
    }

    // 10. Intelligent Section Detection (Scrollspy)
    const sectionKeys = ['home', 'solar-systems', 'how-it-works'];
    function onScrollDetectSection() {
        const scrollPos = window.scrollY + 200;
        let detected = 'home';

        if (window.scrollY > 150) {
            for (let i = sectionKeys.length - 1; i >= 0; i--) {
                const secEl = document.getElementById(sectionKeys[i]);
                if (secEl && secEl.offsetTop <= scrollPos) {
                    detected = sectionKeys[i];
                    break;
                }
            }
        }

        if (detected !== currentActiveSection) {
            currentActiveSection = detected;
            // Only update if not actively hovering the nav
            if (!desktopNav || !desktopNav.matches(':hover')) {
                renderNavUnderline(currentActiveSection);
            }
        }
    }

    window.addEventListener('scroll', onScrollDetectSection, { passive: true });
    onScrollDetectSection();

    // 11. Mobile & Tablet Navigation Drawer Controller
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileMenuBackdrop = document.getElementById('mobileMenuBackdrop');
    const burgerLine1 = document.getElementById('burgerLine1');
    const burgerLine2 = document.getElementById('burgerLine2');
    const burgerLine3 = document.getElementById('burgerLine3');
    let isMobileMenuOpen = false;

    function toggleMobileMenu(forceState) {
        isMobileMenuOpen = (forceState !== undefined) ? forceState : !isMobileMenuOpen;
        if (!mobileMenuBtn || !mobileMenu) return;

        mobileMenuBtn.setAttribute('aria-expanded', isMobileMenuOpen);

        if (isMobileMenuOpen) {
            // Lock body scroll safely
            document.body.style.overflow = 'hidden';

            // Backdrop in
            if (mobileMenuBackdrop) {
                mobileMenuBackdrop.classList.remove('pointer-events-none', 'opacity-0');
                mobileMenuBackdrop.classList.add('opacity-100');
            }

            // Panel in
            mobileMenu.classList.remove('pointer-events-none', '-translate-y-4', 'scale-98', 'opacity-0');
            mobileMenu.classList.add('translate-y-0', 'scale-100', 'opacity-100');

            // Morph 3-bar '☰' into 'X'
            if (burgerLine1) burgerLine1.style.transform = 'translateY(6.5px) rotate(45deg)';
            if (burgerLine2) {
                burgerLine2.style.opacity = '0';
                burgerLine2.style.transform = 'scaleX(0)';
            }
            if (burgerLine3) burgerLine3.style.transform = 'translateY(-6.5px) rotate(-45deg)';
        } else {
            // Restore body scroll safely
            document.body.style.overflow = '';

            // Backdrop out
            if (mobileMenuBackdrop) {
                mobileMenuBackdrop.classList.add('pointer-events-none', 'opacity-0');
                mobileMenuBackdrop.classList.remove('opacity-100');
            }

            // Panel out
            mobileMenu.classList.add('pointer-events-none', '-translate-y-4', 'scale-98', 'opacity-0');
            mobileMenu.classList.remove('translate-y-0', 'scale-100', 'opacity-100');

            // Morph 'X' back into 3-bar '☰'
            if (burgerLine1) burgerLine1.style.transform = 'translateY(0px) rotate(0deg)';
            if (burgerLine2) {
                burgerLine2.style.opacity = '1';
                burgerLine2.style.transform = 'scaleX(1)';
            }
            if (burgerLine3) burgerLine3.style.transform = 'translateY(0px) rotate(0deg)';
        }
    }

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMobileMenu();
        });
    }

    if (mobileMenuBackdrop) {
        mobileMenuBackdrop.addEventListener('click', () => {
            toggleMobileMenu(false);
        });
    }

    document.querySelectorAll('.mobile-nav-link').forEach(link => {
        link.addEventListener('click', () => {
            const targetKey = link.getAttribute('data-nav') || (link.getAttribute('href') || '').replace('#', '');
            currentActiveSection = targetKey;
            renderNavUnderline(currentActiveSection);
            toggleMobileMenu(false);
        });
    });

    document.addEventListener('click', (e) => {
        if (isMobileMenuOpen && mobileMenu && !mobileMenu.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
            toggleMobileMenu(false);
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isMobileMenuOpen) {
            toggleMobileMenu(false);
        }
    });

    // 12. Feature Badges Animated Values Controller
    (function initFeatureBadgesObserver() {
        const badgesSection = document.getElementById('featureBadgesContainer');
        if (!badgesSection) return;

        const dpEl = document.getElementById('badgeDpVal');
        const billsEl = document.getElementById('badgeBillsVal');
        const brownoutEl = document.getElementById('badgeBrownoutVal');
        const brownoutRing = document.getElementById('badgeBrownoutRing');

        const ringCircumference = 75.4; // 2 * PI * 12 for r=12

        // Set final static values (for reduced motion or completion)
        const setFinalValues = () => {
            if (dpEl) dpEl.textContent = '₱10,000';
            if (billsEl) {
                billsEl.textContent = '5 Years';
                billsEl.style.opacity = '1';
                billsEl.style.transform = 'translateY(0)';
            }
            if (brownoutEl) brownoutEl.textContent = '0%';
        };

        // Accessibility check: Respect prefers-reduced-motion
        const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) {
            setFinalValues();
            return;
        }

        // Initial starting display before trigger
        if (dpEl) dpEl.textContent = '₱50,000';
        if (billsEl) billsEl.textContent = '6 Months';
        if (brownoutEl) brownoutEl.textContent = '100%';

        let hasAnimated = false;

        function runFeatureAnimation() {
            if (hasAnimated) return;
            hasAnimated = true;

            const duration = 2200; // 2.2 seconds for calm, premium feel
            const startTime = performance.now();

            // Down Payment: ₱50,000 -> ₱10,000
            const startDp = 50000;
            const endDp = 10000;

            // Monthly Bills sequence: 6 Months -> 1 Year -> 2 Years -> 3 Years -> 4 Years -> 5 Years
            const billStages = ['6 Months', '1 Year', '2 Years', '3 Years', '4 Years', '5 Years'];
            let currentStageIndex = 0;

            // Brownouts: 100% -> 0%
            const startBrownout = 100;
            const endBrownout = 0;

            // Easing: easeOutQuart for smooth acceleration and long, natural deceleration
            function easeOutQuart(t) {
                return 1 - Math.pow(1 - t, 4);
            }

            function updateBillsStage(newIndex) {
                if (!billsEl || newIndex === currentStageIndex) return;
                currentStageIndex = newIndex;
                billsEl.style.opacity = '0.3';
                billsEl.style.transform = 'translateY(2px)';
                setTimeout(() => {
                    billsEl.textContent = billStages[newIndex];
                    billsEl.style.opacity = '1';
                    billsEl.style.transform = 'translateY(0)';
                }, 80);
            }

            function frame(currentTime) {
                const elapsed = currentTime - startTime;
                const progress = Math.min(1, elapsed / duration);
                const eased = easeOutQuart(progress);

                // 1. Down Payment smooth count down
                if (dpEl) {
                    const rawDp = startDp - (startDp - endDp) * eased;
                    const dpVal = progress >= 1 ? endDp : Math.round(rawDp / 10) * 10;
                    dpEl.textContent = '₱' + dpVal.toLocaleString('en-PH');
                }

                // 2. Monthly Bills step transitions (distributed smoothly across timeline)
                if (billsEl) {
                    const stageProgress = Math.min(1, progress / 0.85);
                    const stageIdx = Math.min(billStages.length - 1, Math.floor(stageProgress * billStages.length));
                    updateBillsStage(stageIdx);
                }

                // 3. Brownouts smooth countdown (100% -> 0%)
                if (brownoutEl) {
                    const rawPct = Math.round(startBrownout - (startBrownout - endBrownout) * eased);
                    brownoutEl.textContent = rawPct + '%';
                }

                if (progress < 1) {
                    requestAnimationFrame(frame);
                } else {
                    setFinalValues();
                }
            }

            requestAnimationFrame(frame);
        }

        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        runFeatureAnimation();
                        observer.disconnect();
                    }
                });
            }, { threshold: 0.25 });
            observer.observe(badgesSection);
        } else {
            runFeatureAnimation();
        }
    })();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPageInteractions);
} else {
    initPageInteractions();
}
