(function () {

    if (document.getElementById("nr-quick-popup")) return;

    const cache = new Map();

    const popup = document.createElement("dialog");

    popup.id = "nr-quick-popup";

    popup.innerHTML = `
        <button id="nr-quick-close"
                aria-label="Cerrar">×</button>

        <div class="nr-quick-layout">

            <img id="nr-quick-image" alt="">

            <div>
                <div id="nr-quick-name"></div>
                <div id="nr-quick-price"></div>
                <div id="nr-quick-sizes"></div>

                <a id="nr-quick-link">
                    VER PRODUCTO
                </a>
            </div>

        </div>
    `;

    document.body.appendChild(popup);

    document.getElementById("nr-quick-close")
        .addEventListener("click", function () {
            popup.close();
        });

    /* CONSULTAR INFORMACION REAL DEL PRODUCTO */

    function getProduct(url) {

        if (!cache.has(url)) {

            const request = fetch(url)
                .then(response => {
                    if (!response.ok) throw new Error();
                    return response.text();
                })
                .then(html => {

                    const doc = new DOMParser()
                        .parseFromString(html, "text/html");

                    const product = doc.querySelector(
                        "#single-product[data-variants]"
                    );

                    let variants = [];

                    if (product) {
                        const raw = JSON.parse(
                            product.getAttribute("data-variants")
                        );

                        variants = Array.isArray(raw)
                            ? raw
                            : Object.values(raw);
                    }

                    const sizes = new Map();

                    const isSize = value =>
                        /^(XXXS|XXS|XS|S|M|L|XL|XXL|XXXL|[2-6]\d)$/i
                        .test(String(value).trim());

                    variants.forEach(v => {

                        if (!v || typeof v !== "object") return;

                        const options = [
                            v.option0,
                            v.option1,
                            v.option2
                        ].filter(x => x != null && x !== "");

                        const candidates = options.filter(isSize);

                        if (candidates.length !== 1) return;

                        const size = String(candidates[0]);

                        const available =
                            (v.available === true ||
                             v.available === "true") &&
                            (v.stock == null || Number(v.stock) > 0);

                        sizes.set(
                            size,
                            available || sizes.get(size) || false
                        );

                    });

                    return {
                        name: doc.querySelector("h1")
                            ?.textContent.trim() || "",

                        image: doc.querySelector(
                            'meta[property="og:image"]'
                        )?.content || "",

                        price: doc.querySelector("#price_display")
                            ?.textContent.trim() || "",

                        sizes: [...sizes.entries()]
                    };

                });

            cache.set(url, request);

        }

        return cache.get(url);

    }

    function renderSizes(container, sizes) {

        container.replaceChildren();

        if (!sizes.length) return;

        const title = document.createElement("div");
        title.className = "nr-size-title";
        title.textContent = "TALLES";

        const row = document.createElement("div");
        row.className = "nr-sizes";

        sizes.forEach(([size, available]) => {

            const badge = document.createElement("span");

            badge.className = available
                ? "nr-size"
                : "nr-size nr-size-unavailable";

            badge.textContent = size;

            badge.title = available
                ? "Disponible"
                : "Agotado";

            row.appendChild(badge);

        });

        container.append(title, row);

    }

    /* ACTIVAR FUNCIONES EN EL CATALOGO */

    function setupProducts() {

        document.querySelectorAll(
            ".js-product-item-image-container-private"
        ).forEach(imageBox => {

            if (imageBox.dataset.nrEnhanced) return;

            const link = imageBox.querySelector(
                ".js-product-item-image-link-private"
            );

            if (!link || !link.href) return;

            let card = imageBox.parentElement;

            while (
                card &&
                !card.querySelector(".product-item-price-container")
            ) {
                card = card.parentElement;
            }

            if (!card || card === document.body) return;

            if (card.querySelectorAll(
                ".js-product-item-image-container-private"
            ).length !== 1) return;

            imageBox.dataset.nrEnhanced = "yes";

            const url = link.href;

            const priceBox = card.querySelector(
                ".product-item-price-container"
            );

            const sizesBox = document.createElement("div");

            priceBox.insertAdjacentElement("afterend", sizesBox);

            /* CARGAR TALLES AL ACERCARSE AL PRODUCTO */

            const observer = new IntersectionObserver(entries => {

                if (!entries.some(e => e.isIntersecting)) return;

                observer.disconnect();

                getProduct(url)
                    .then(data => renderSizes(sizesBox, data.sizes))
                    .catch(() => {});

            }, {rootMargin: "100px"});

            observer.observe(imageBox);

            /* BOTON VISTA RAPIDA */

            const button = document.createElement("button");

            button.type = "button";
            button.className = "nr-quick-button";
            button.textContent = "VISTA RÁPIDA";

            imageBox.appendChild(button);

            button.addEventListener("click", function (event) {

                event.preventDefault();
                event.stopPropagation();

                button.textContent = "CARGANDO...";

                getProduct(url).then(data => {

                    const image = document.getElementById(
                        "nr-quick-image"
                    );

                    image.src = data.image ||
                        imageBox.querySelector("img")?.src || "";

                    image.alt = data.name;

                    document.getElementById(
                        "nr-quick-name"
                    ).textContent = data.name;

                    document.getElementById(
                        "nr-quick-price"
                    ).textContent = data.price;

                    document.getElementById(
                        "nr-quick-link"
                    ).href = url;

                    renderSizes(
                        document.getElementById("nr-quick-sizes"),
                        data.sizes
                    );

                    if (!popup.open) popup.showModal();

                }).catch(() => {

                    window.location.href = url;

                }).finally(() => {

                    button.textContent = "VISTA RÁPIDA";

                });

            });

        });

    }

    setupProducts();
    setTimeout(setupProducts, 1500);
    setTimeout(setupProducts, 4000);

})();
;
(function () {

    function moveSizes() {

        document.querySelectorAll(
            ".js-product-item-image-container-private"
        ).forEach(imageBox => {

            if (imageBox.querySelector(".nr-hover-sizes")) {
                return;
            }

            let card = imageBox.parentElement;

            while (
                card &&
                !card.querySelector(".product-item-price-container")
            ) {
                card = card.parentElement;
            }

            if (!card || card === document.body) return;

            if (card.querySelectorAll(
                ".js-product-item-image-container-private"
            ).length !== 1) return;

            const sizes = card.querySelector(".nr-sizes");

            if (!sizes || !sizes.children.length) return;

            const title = card.querySelector(".nr-size-title");

            if (title) title.remove();

            sizes.classList.add("nr-hover-sizes");

            imageBox.style.position = "relative";

            imageBox.appendChild(sizes);

        });

    }

    moveSizes();

    const observer = new MutationObserver(moveSizes);

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();
