/**
 * Freezy Bites API Client
 * Connects the frontend to the Next.js backend API
 */

var FreezybiteAPI = (function () {
    var API_BASE = 'http://localhost:3000/api';
    var authToken = null;
    var currentUser = null;

    // Load auth state from localStorage
    function loadAuthState() {
        try {
            authToken = localStorage.getItem('fb_auth_token');
            var userData = localStorage.getItem('fb_auth_user');
            if (userData) {
                currentUser = JSON.parse(userData);
            }
        } catch (e) {
            console.warn('Failed to load auth state:', e);
        }
    }

    // Save auth state to localStorage
    function saveAuthState() {
        try {
            if (authToken) {
                localStorage.setItem('fb_auth_token', authToken);
            } else {
                localStorage.removeItem('fb_auth_token');
            }
            if (currentUser) {
                localStorage.setItem('fb_auth_user', JSON.stringify(currentUser));
            } else {
                localStorage.removeItem('fb_auth_user');
            }
        } catch (e) {
            console.warn('Failed to save auth state:', e);
        }
    }

    // HTTP request helper
    function request(method, endpoint, data) {
        var headers = {
            'Content-Type': 'application/json'
        };
        if (authToken) {
            headers['Authorization'] = 'Bearer ' + authToken;
        }

        var options = {
            method: method,
            headers: headers
        };

        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }

        return fetch(API_BASE + endpoint, options)
            .then(function (response) {
                return response.json().then(function (json) {
                    if (!response.ok) {
                        throw new Error(json.error || 'Request failed');
                    }
                    return json;
                });
            });
    }

    // Initialize on load
    loadAuthState();

    return {
        // ============ AUTH ============
        login: function (email, password) {
            return request('POST', '/auth/login', { email: email, password: password })
                .then(function (result) {
                    authToken = result.token;
                    currentUser = result.user;
                    saveAuthState();
                    return result;
                });
        },

        signup: function (email, password, fullName) {
            return request('POST', '/auth/signup', { email: email, password: password, fullName: fullName })
                .then(function (result) {
                    authToken = result.token;
                    currentUser = result.user;
                    saveAuthState();
                    return result;
                });
        },

        logout: function () {
            authToken = null;
            currentUser = null;
            saveAuthState();
            return Promise.resolve({ message: 'Logged out' });
        },

        isLoggedIn: function () {
            return !!authToken && !!currentUser;
        },

        getUser: function () {
            return currentUser;
        },

        // ============ PRODUCTS ============
        getProducts: function (options) {
            var params = [];
            options = options || {};
            if (options.category) params.push('category=' + encodeURIComponent(options.category));
            if (options.limit) params.push('limit=' + options.limit);
            if (options.page) params.push('page=' + options.page);
            var query = params.length ? '?' + params.join('&') : '';
            return request('GET', '/products' + query);
        },

        getProduct: function (id) {
            return request('GET', '/products/' + id);
        },

        // ============ CART ============
        getCart: function () {
            if (!currentUser) {
                return Promise.reject(new Error('Not logged in'));
            }
            return request('GET', '/cart?userId=' + currentUser.id);
        },

        addToCart: function (productId, quantity) {
            if (!currentUser) {
                return Promise.reject(new Error('Not logged in'));
            }
            return request('POST', '/cart', {
                userId: currentUser.id,
                productId: productId,
                quantity: quantity || 1
            });
        },

        removeFromCart: function (cartItemId) {
            return request('DELETE', '/cart?id=' + cartItemId);
        },

        // ============ CHECKOUT ============
        /**
         * Checkout with cart (authenticated users)
         */
        checkoutWithCart: function () {
            if (!currentUser) {
                return Promise.reject(new Error('Not logged in'));
            }
            return request('POST', '/checkout', { userId: currentUser.id });
        },

        /**
         * Guest checkout with items array
         * @param {Array} items - Array of {productId, quantity}
         * @param {Object} guestInfo - {email, name, phone, address}
         */
        guestCheckout: function (items, guestInfo) {
            return request('POST', '/checkout', {
                items: items,
                guest: guestInfo
            });
        },

        // ============ ORDERS ============
        getOrderHistory: function () {
            if (!currentUser) {
                return Promise.reject(new Error('Not logged in'));
            }
            return request('GET', '/orders/history?userId=' + currentUser.id);
        },

        getOrder: function (orderId) {
            return request('GET', '/orders/' + orderId);
        },

        // ============ REVIEWS ============
        getReviews: function (productId) {
            return request('GET', '/reviews?productId=' + productId);
        },

        addReview: function (productId, rating, comment) {
            if (!currentUser) {
                return Promise.reject(new Error('Not logged in'));
            }
            return request('POST', '/reviews', {
                productId: productId,
                userId: currentUser.id,
                rating: rating,
                comment: comment
            });
        }
    };
})();

// Export for module systems if available
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FreezybiteAPI;
}
