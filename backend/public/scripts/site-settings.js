/**
 * site-settings.js
 * Loads store settings from /api/settings and dynamically updates:
 * - Logo image (header .logo img)
 * - Page title (document.title)
 * - Footer contact info (phone, email)
 * - Copyright store name
 */
(function () {
    document.addEventListener('DOMContentLoaded', async function () {
        try {
            const res = await fetch('/api/settings');
            if (!res.ok) return;
            const data = await res.json();

            // === Branding: Logo + Store Name ===
            if (data.branding) {
                // Update logo image
                if (data.branding.logo) {
                    const logoImgs = document.querySelectorAll('.logo img, .brand-nav .logo img');
                    logoImgs.forEach(function (img) {
                        img.src = data.branding.logo;
                        if (data.branding.storeName) img.alt = data.branding.storeName;
                    });
                }

                // Update page title with store name
                if (data.branding.storeName) {
                    const currentTitle = document.title;
                    // Replace "Freezy Bite" in the title
                    if (currentTitle.includes('Freezy Bite')) {
                        document.title = currentTitle.replace('Freezy Bite', data.branding.storeName);
                    }

                    // Update copyright text in footer
                    const copyright = document.querySelector('.copyright');
                    if (copyright) {
                        copyright.innerHTML = copyright.innerHTML.replace(/Freezy Bite/g, data.branding.storeName);
                    }
                }
            }

            // === Store Info: Footer Contact ===
            if (data.store) {
                const phoneSpan = document.querySelector('.footer-contact .fc-row:first-child span');
                const emailSpan = document.querySelector('.footer-contact .fc-row:last-child span');
                if (phoneSpan && data.store.phone) phoneSpan.textContent = data.store.phone;
                if (emailSpan && data.store.email) emailSpan.textContent = data.store.email;
            }

            // === Payment: InstaPay number ===
            if (data.payment && data.payment.instapayNumber) {
                const noteEl = document.querySelector('.co-note');
                if (noteEl) {
                    noteEl.innerHTML = 'Payment method: Cash on Delivery. To confirm your order faster, send a small deposit via InstaPay to <strong>' + data.payment.instapayNumber + '</strong> — our team will contact you to confirm.';
                }
            }

            // === Contact Page: Address, Phone, Email ===
            if (data.store) {
                const card = document.querySelector('.contact-card');
                if (card) {
                    const ps = card.querySelectorAll('p');
                    if (ps[0] && data.store.address) ps[0].innerHTML = '<strong>Visit Us</strong><br> ' + data.store.address;
                    if (ps[1] && data.store.phone) ps[1].innerHTML = '<strong>Call or WhatsApp</strong><br> ' + data.store.phone;
                    if (ps[2] && data.store.email) ps[2].innerHTML = '<strong>Email</strong><br> ' + data.store.email;
                }
            }
        } catch (e) {
            // Silently fail — pages still work with hardcoded values
        }
    });
})();
