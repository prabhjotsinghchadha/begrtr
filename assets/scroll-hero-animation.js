/**
 * Scroll-Driven Frame-by-Frame Hero Animation
 * 
 * Displays a sequence of WebP images (shoe_0001.webp to shoe_0058.webp)
 * controlled by scroll position. Frames advance as user scrolls down.
 */

(function() {
  'use strict';

  class ScrollHeroAnimation {
    constructor(element) {
      this.container = element;
      // Support both standalone and hero section structures
      this.image = element.querySelector('[data-scroll-hero-image]');
      
      if (!this.image) {
        console.warn('Scroll hero animation: image element not found');
        return;
      }
      
      // For hero section integration, we need to find the hero container for scroll calculations
      if (element.hasAttribute('data-scroll-hero-container')) {
        // Find the parent hero element for scroll calculations
        this.heroElement = element.closest('.hero');
        if (this.heroElement) {
          this.container = this.heroElement;
        }
      }

      // Configuration
      this.totalFrames = parseInt(this.image.dataset.totalFrames) || 58;
      this.firstFrame = parseInt(this.image.dataset.firstFrame) || 1;
      this.lastFrame = this.firstFrame + this.totalFrames - 1;
      
      // Preload first 10 frames for smooth initial experience
      this.preloadCount = 10;
      
      // Initialize asset base URL from current image src
      this.initAssetBaseUrl();
      
      // Track loaded frames to avoid redundant requests
      this.loadedFrames = new Set();
      
      // Current frame state
      this.currentFrame = this.firstFrame;
      
      // Scroll tracking
      this.containerStartScroll = 0;
      this.containerEndScroll = 0;
      this.isInitialized = false;
      
      // Performance optimization
      this.rafId = null;
      this.isScrolling = false;
      
      // Initialize
      this.init();
    }

    init() {
      // Preload initial frames
      this.preloadFrames();
      
      // Set up scroll listener
      this.setupScrollListener();
      
      // Set up intersection observer for performance
      this.setupIntersectionObserver();
      
      // Initial frame display
      this.updateFrame(this.firstFrame);
    }

    /**
     * Preload first N frames for smooth initial animation
     */
    preloadFrames() {
      const framesToPreload = Math.min(this.preloadCount, this.totalFrames);
      
      for (let i = 0; i < framesToPreload; i++) {
        const frameNum = this.firstFrame + i;
        this.loadFrame(frameNum, true);
      }
    }

    /**
     * Load a specific frame image
     * @param {number} frameNum - Frame number (1-58)
     * @param {boolean} preload - If true, preload without displaying
     */
    loadFrame(frameNum, preload = false) {
      // Clamp frame number to valid range
      frameNum = Math.max(this.firstFrame, Math.min(this.lastFrame, frameNum));
      
      // Skip if already loaded (unless we need to display it)
      if (this.loadedFrames.has(frameNum) && preload) {
        return;
      }

      const frameName = this.getFrameFileName(frameNum);
      const imageUrl = this.getAssetUrl(frameName);
      
      // Create new image to preload
      const img = new Image();
      
      img.onload = () => {
        this.loadedFrames.add(frameNum);
        
        // If this is the current frame and not just preloading, update display
        if (!preload && frameNum === this.currentFrame) {
          this.image.src = imageUrl;
        }
      };
      
      img.onerror = () => {
        console.warn(`Failed to load frame: ${frameName}`);
      };
      
      img.src = imageUrl;
    }

    /**
     * Get frame file name with zero padding
     * @param {number} frameNum - Frame number
     * @returns {string} - File name like "shoe_0001.webp"
     */
    getFrameFileName(frameNum) {
      const paddedNum = String(frameNum).padStart(4, '0');
      return `shoe_${paddedNum}.webp`;
    }
    
    /**
     * Initialize asset base URL (called after getFrameFileName is available)
     */
    initAssetBaseUrl() {
      const currentSrc = this.image.src;
      const lastSlashIndex = currentSrc.lastIndexOf('/');
      this.assetBaseUrl = currentSrc.substring(0, lastSlashIndex + 1);
    }

    /**
     * Get Shopify asset URL
     * @param {string} filename - Asset filename
     * @returns {string} - Full asset URL
     */
    getAssetUrl(filename) {
      // Use the asset base URL from data attribute or fallback
      return `${this.assetBaseUrl}${filename}`;
    }

    /**
     * Initialize scroll boundaries for the container
     */
    initScrollBoundaries() {
      const containerRect = this.container.getBoundingClientRect();
      const scrollY = window.scrollY || window.pageYOffset;
      const viewportHeight = window.innerHeight;
      
      // Calculate when container starts sticking (when top reaches viewport top)
      this.containerStartScroll = scrollY + containerRect.top;
      
      // Calculate when container stops sticking (after scrolling through full height)
      const containerHeight = this.container.offsetHeight;
      this.containerEndScroll = this.containerStartScroll + (containerHeight - viewportHeight);
      
      this.isInitialized = true;
    }

    /**
     * Calculate current frame based on scroll position
     * @returns {number} - Frame number (1-58)
     */
    calculateFrameFromScroll() {
      // Initialize boundaries on first call
      if (!this.isInitialized) {
        this.initScrollBoundaries();
      }
      
      const scrollY = window.scrollY || window.pageYOffset;
      
      // Calculate scroll progress through the container
      // Progress = 0 when scroll is at containerStartScroll
      // Progress = 1 when scroll is at containerEndScroll
      const scrollRange = this.containerEndScroll - this.containerStartScroll;
      
      if (scrollRange <= 0) {
        // Container hasn't started sticking yet or calculation error
        return this.firstFrame;
      }
      
      const scrolledAmount = scrollY - this.containerStartScroll;
      const scrollProgress = Math.max(0, Math.min(1, scrolledAmount / scrollRange));
      
      // Map scroll progress to frame number
      // Linear mapping: 0 -> firstFrame, 1 -> lastFrame
      const frameNum = Math.round(
        this.firstFrame + (scrollProgress * (this.totalFrames - 1))
      );
      
      return Math.max(this.firstFrame, Math.min(this.lastFrame, frameNum));
    }

    /**
     * Update displayed frame
     * @param {number} frameNum - Frame number to display
     */
    updateFrame(frameNum) {
      // Clamp to valid range
      frameNum = Math.max(this.firstFrame, Math.min(this.lastFrame, frameNum));
      
      if (frameNum === this.currentFrame) {
        return; // No change needed
      }
      
      this.currentFrame = frameNum;
      
      // Load frame if not already loaded
      if (!this.loadedFrames.has(frameNum)) {
        this.loadFrame(frameNum, false);
      } else {
        // Update image src immediately if already loaded
        const frameName = this.getFrameFileName(frameNum);
        const imageUrl = this.getAssetUrl(frameName);
        this.image.src = imageUrl;
      }
      
      // Preload adjacent frames for smooth scrolling
      this.preloadAdjacentFrames(frameNum);
    }

    /**
     * Preload frames adjacent to current frame for smooth scrolling
     * @param {number} frameNum - Current frame number
     */
    preloadAdjacentFrames(frameNum) {
      // Preload next 3 frames ahead
      for (let i = 1; i <= 3; i++) {
        const nextFrame = frameNum + i;
        if (nextFrame <= this.lastFrame && !this.loadedFrames.has(nextFrame)) {
          this.loadFrame(nextFrame, true);
        }
      }
      
      // Preload previous 2 frames behind (for scroll up)
      for (let i = 1; i <= 2; i++) {
        const prevFrame = frameNum - i;
        if (prevFrame >= this.firstFrame && !this.loadedFrames.has(prevFrame)) {
          this.loadFrame(prevFrame, true);
        }
      }
    }

    /**
     * Handle scroll event with requestAnimationFrame throttling
     */
    handleScroll() {
      if (!this.isScrolling) {
        this.isScrolling = true;
        this.rafId = requestAnimationFrame(() => {
          const newFrame = this.calculateFrameFromScroll();
          this.updateFrame(newFrame);
          this.isScrolling = false;
        });
      }
    }

    /**
     * Set up scroll event listener
     */
    setupScrollListener() {
      // Use passive listener for better performance
      window.addEventListener('scroll', () => this.handleScroll(), { 
        passive: true 
      });
      
      // Also listen to resize for accurate calculations
      window.addEventListener('resize', () => {
        this.isInitialized = false; // Recalculate boundaries on resize
        this.handleScroll();
      }, { 
        passive: true 
      });
      
      // Initial calculation
      this.handleScroll();
    }

    /**
     * Set up IntersectionObserver to pause updates when not visible
     */
    setupIntersectionObserver() {
      if (!window.IntersectionObserver) return;
      
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              // Container is visible, enable updates
              this.handleScroll();
            }
          });
        },
        {
          root: null,
          rootMargin: '50%', // Start loading when container is 50% away
          threshold: 0
        }
      );
      
      observer.observe(this.container);
    }

    /**
     * Cleanup method
     */
    destroy() {
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
      }
      this.loadedFrames.clear();
    }
  }

  // Initialize all scroll hero animations on page load
  function initScrollHeroAnimations() {
    // Support both standalone section and hero section integration
    const standaloneElements = document.querySelectorAll('.scroll-hero-animation');
    const heroElements = document.querySelectorAll('[data-scroll-hero-container]');
    const instances = [];
    
    // Initialize standalone sections
    standaloneElements.forEach(element => {
      try {
        const instance = new ScrollHeroAnimation(element);
        instances.push(instance);
      } catch (error) {
        console.error('Error initializing scroll hero animation:', error);
      }
    });
    
    // Initialize hero section integrations
    heroElements.forEach(element => {
      try {
        const instance = new ScrollHeroAnimation(element);
        instances.push(instance);
      } catch (error) {
        console.error('Error initializing scroll hero animation in hero section:', error);
      }
    });
    
    // Store instances for potential cleanup
    window.scrollHeroAnimations = instances;
  }

  // Initialize when DOM is ready
  function initializeWhenReady() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initScrollHeroAnimations);
    } else {
      // DOM already loaded, initialize immediately
      initScrollHeroAnimations();
    }
  }

  // Initialize immediately if script loads after DOM is ready
  initializeWhenReady();

  // Also try after a short delay to catch any late-loading elements
  setTimeout(initScrollHeroAnimations, 100);

  // Re-initialize on Shopify theme editor changes
  if (window.Shopify && window.Shopify.designMode) {
    document.addEventListener('shopify:section:load', (event) => {
      const sectionId = event.detail.sectionId;
      // Try both selectors
      const elementById = document.querySelector(`#scroll-hero-${sectionId}`);
      const elementByData = document.querySelector(`[data-scroll-hero-container][id*="${sectionId}"]`);
      const element = elementById || elementByData;
      if (element) {
        try {
          new ScrollHeroAnimation(element);
        } catch (error) {
          console.error('Error initializing scroll hero animation in theme editor:', error);
        }
      }
    });
    
    // Also listen for section reorder
    document.addEventListener('shopify:section:reorder', initScrollHeroAnimations);
    document.addEventListener('shopify:section:select', initScrollHeroAnimations);
  }
})();

