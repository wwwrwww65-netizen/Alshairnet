const Banner = (function () {
    let bannerEl = null;

    function createBanner() {
        bannerEl = document.createElement("div");
        bannerEl.id = "custom-banner";
        bannerEl.style.position = "fixed";
        bannerEl.style.top = "-130px";
        bannerEl.style.left = "50%";
        bannerEl.style.transform = "translateX(-50%)";
        bannerEl.style.padding = "14px 22px";
        bannerEl.style.borderRadius = "10px";
        bannerEl.style.color = "#fff";
        bannerEl.style.fontSize = "16px";
        bannerEl.style.fontWeight = "bold";
        bannerEl.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
        bannerEl.style.zIndex = "999999";
        bannerEl.style.transition = "all 0.45s ease";

        document.body.appendChild(bannerEl);
    }

    function show(message, type = "info", duration = 2500) {
        if (!bannerEl) createBanner();

        const colors = {
            success: "#28a745",
            error: "#e63946",
            warning: "#f4a261",
            info: "#2196f3"
        };

        bannerEl.style.background = colors[type] || colors.info;
        bannerEl.innerText = message;

        // Slide down
        setTimeout(() => {
            bannerEl.style.top = "20px";
        }, 10);

        // Slide back up
        setTimeout(() => {
            bannerEl.style.top = "-100px";
        }, duration);
    }

    return { show };
})();
