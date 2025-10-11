// Google Reviews Widget
// 4+ yıldızlı yorumları gösterir

const GOOGLE_API_KEY = 'AIzaSyBevPK4xCzOBYGSD9qA30pgO66iuWP0MoA';
const PLACE_ID = 'ChIJvWf3BwCzzBQR_-5n57A9DNs';

class GoogleReviewsWidget {
  constructor() {
    this.reviews = [];
    this.loadReviews();
  }

  async loadReviews() {
    try {
      // Google Places API - Place Details
      const proxyUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${PLACE_ID}&fields=reviews,rating,user_ratings_total&key=${GOOGLE_API_KEY}`;
      
      // CORS sorunu olduğu için alternatif yaklaşım kullanacağız
      // Google Maps JavaScript API ile widget oluşturacağız
      this.initGoogleMapsWidget();
      
    } catch (error) {
      console.error('Google Reviews yüklenirken hata:', error);
      this.showFallbackReviews();
    }
  }

  initGoogleMapsWidget() {
    // Google Maps JavaScript API script'i yükle (yeni versiyon - loading=async ile)
    if (!document.getElementById('google-maps-script')) {
      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=places&loading=async&callback=initGoogleReviews`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }

  renderReviews(reviews) {
    const container = document.getElementById('googleReviewsContainer');
    if (!container) return;

    // Tüm yorumları rating'e göre sırala (en yüksek önce)
    
    // Önce tüm yorumları rating'e göre sırala (5⭐ → 1⭐)
    const sortedByRating = reviews.sort((a, b) => b.rating - a.rating);
    
    // Sonra 4+ yıldızlı ve metin içeren yorumları filtrele
    const filteredReviews = sortedByRating
      .filter(review => review.rating >= 4 && review.text && review.text.trim().length > 0)
      .slice(0, 5); // En fazla 5 yorum (en yüksek ratingli)
    

    if (filteredReviews.length === 0) {
      container.innerHTML = '<p class="muted">Henüz yorum yok.</p>';
      return;
    }

    // Carousel yapısı
    container.innerHTML = `
      <div class="reviews-carousel">
        <button class="reviews-prev" aria-label="Önceki">❮</button>
        <div class="reviews-track">
          ${filteredReviews.map(review => `
            <div class="review-card">
              <div class="review-header">
                <img src="${review.profile_photo_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(review.author_name) + '&background=7a1c86&color=fff&size=128'}" 
                     alt="${review.author_name}" 
                     class="review-avatar" />
                <div class="review-info">
                  <h4 class="review-author">${review.author_name}</h4>
                  <div class="review-stars">
                    ${'⭐'.repeat(review.rating)}
                  </div>
                  <p class="review-date">${this.formatDate(review.time)}</p>
                </div>
              </div>
              <p class="review-text">
                ${review.text || 'Harika bir deneyim!'}
              </p>
            </div>
          `).join('')}
        </div>
        <button class="reviews-next" aria-label="Sonraki">❯</button>
      </div>
      <div class="reviews-dots"></div>
      <div class="reviews-cta" style="text-align:center; margin-top: 16px;">
        <a href="https://www.google.com/maps/place/?q=place_id:${PLACE_ID}" target="_blank" rel="noopener" class="btn btn-outline" style="display:inline-block; padding:10px 16px; border-radius:10px; border:1px solid var(--brand);">
          Google'da tüm yorumları gör →
        </a>
      </div>
    `;

    // Carousel fonksiyonlarını başlat
    this.initCarousel(filteredReviews.length);
  }

  initCarousel(totalReviews) {
    const track = document.querySelector('.reviews-track');
    const prevBtn = document.querySelector('.reviews-prev');
    const nextBtn = document.querySelector('.reviews-next');
    const dotsContainer = document.querySelector('.reviews-dots');
    
    if (!track || !prevBtn || !nextBtn || !dotsContainer) return;

    let currentIndex = 0;
    const isMobile = window.innerWidth < 768;
    const cardsToShow = isMobile ? 1 : (window.innerWidth < 1024 ? 2 : 3);
    const maxIndex = Math.max(0, totalReviews - cardsToShow);

    // Dots oluştur
    for (let i = 0; i <= maxIndex; i++) {
      const dot = document.createElement('span');
      dot.className = 'review-dot';
      if (i === 0) dot.classList.add('active');
      dot.addEventListener('click', () => goToSlide(i));
      dotsContainer.appendChild(dot);
    }

    const updateCarousel = () => {
      const cardWidth = track.querySelector('.review-card').offsetWidth;
      const gap = 24;
      const offset = currentIndex * (cardWidth + gap);
      track.style.transform = `translateX(-${offset}px)`;

      // Dots güncelle
      document.querySelectorAll('.review-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === currentIndex);
      });

      // Butonları devre dışı bırak
      prevBtn.disabled = currentIndex === 0;
      nextBtn.disabled = currentIndex >= maxIndex;
    };

    const goToSlide = (index) => {
      currentIndex = Math.max(0, Math.min(index, maxIndex));
      updateCarousel();
    };

    prevBtn.addEventListener('click', () => goToSlide(currentIndex - 1));
    nextBtn.addEventListener('click', () => goToSlide(currentIndex + 1));

    // Responsive update
    window.addEventListener('resize', () => {
      const newCardsToShow = window.innerWidth < 768 ? 1 : (window.innerWidth < 1024 ? 2 : 3);
      if (newCardsToShow !== cardsToShow) {
        location.reload(); // Basit çözüm - resize'da yenile
      }
    });

    updateCarousel();
  }

  formatDate(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('tr-TR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  showFallbackReviews() {
    // API çalışmazsa örnek yorumlar göster
    const container = document.getElementById('googleReviewsContainer');
    if (!container) return;

    container.innerHTML = `
      <p class="muted">Google yorumlarımızı görmek için 
        <a href="https://www.google.com/maps/place/Sakarya+Orion+Turizm/@40.7746235,30.3618203,17z" 
           target="_blank" 
           style="color: var(--brand); text-decoration: underline;">
          Google Maps profilimizi ziyaret edin
        </a>
      </p>
    `;
  }
}

// Global callback fonksiyonu (Yeni Places API)
window.initGoogleReviews = async function() {
  try {
    // Yeni Places API (Mart 2025 sonrası önerilen)
    const { Place } = await google.maps.importLibrary("places");
    
    const place = new Place({
      id: PLACE_ID,
    });

    // fetchFields ile veri çek
    await place.fetchFields({
      fields: ['reviews', 'rating', 'userRatingCount']
    });

    if (place.reviews && place.reviews.length > 0) {
      const widget = new GoogleReviewsWidget();
      // Yeni API formatını eski formata çevir
      const formattedReviews = place.reviews.map(review => ({
        rating: review.rating,
        text: review.text,
        author_name: review.authorAttribution?.displayName || 'Anonim',
        profile_photo_url: review.authorAttribution?.photoURI || '',
        time: review.publishTime ? new Date(review.publishTime).getTime() / 1000 : Date.now() / 1000
      }));
      widget.renderReviews(formattedReviews);
    } else {
      console.warn('Yorum bulunamadı');
      const widget = new GoogleReviewsWidget();
      widget.showFallbackReviews();
    }
  } catch (error) {
    console.error('Google Places API hatası:', error);
    const widget = new GoogleReviewsWidget();
    widget.showFallbackReviews();
  }
};

// Sayfa yüklendiğinde başlat
document.addEventListener('DOMContentLoaded', () => {
  const widget = new GoogleReviewsWidget();
});

