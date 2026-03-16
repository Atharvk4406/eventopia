/*********************************
 * IMAGE PRELOADER (FIXED FOR FLASK)
 *********************************/
const preloadImages = [
  "/static/images/1st.jpeg",
  "/static/images/2nd.jpeg",
  "/static/images/3rd.jpeg"
];

preloadImages.forEach(src => {
  const img = new Image();
  img.src = src;
});


/*********************************
 * DARK MODE TOGGLE (FIXED PATHS)
 *********************************/
const icon = document.getElementById("icon");

if (icon) {
  icon.onclick = function () {
    document.body.classList.toggle("dark-theme");

    if (document.body.classList.contains("dark-theme")) {
      icon.src = "/static/images/sun.png";
    } else {
      icon.src = "/static/images/moon.png";
    }
  };
}


/*********************************
 * 3-IMAGE INFINITE CAROUSEL SLIDER
 *********************************/
document.addEventListener("DOMContentLoaded", () => {

  const track = document.querySelector(".carousel-track");
  const slides = document.querySelectorAll(".slide");

  let index = 0;
  const totalSlides = slides.length;

  function moveSlider() {
    index++;
    if (index > totalSlides - 3) {
      index = 0;
    }

    track.style.transform = `translateX(-${index * 33.33}%)`;
  }

 let autoSlide= setInterval(moveSlider, 3000);



  /******** TOUCH SWIPE SUPPORT ********/
  let startX = 0;
  let endX = 0;

  track.addEventListener("touchstart", (e) => {
    clearInterval(autoSlide);
    startX = e.touches[0].clientX;
  });

  track.addEventListener("touchmove", (e) => {
    endX = e.touches[0].clientX;
  });

  track.addEventListener("touchend", () => {
    let diff = startX - endX;

    if (diff > 40) index++;
    if (diff < -40) index--;

    track.style.transition = "transform 0.5s ease-in-out";
    track.style.transform = `translateX(-${index * slideWidth}px)`;

    autoSlide = setInterval(moveSlider, 3000);
  });

  /******** WINDOW RESIZE FIX ********/
  window.addEventListener("resize", () => {
    slideWidth = slides[0].clientWidth;
    track.style.transition = "none";
    track.style.transform = `translateX(-${index * slideWidth}px)`;
  });

});