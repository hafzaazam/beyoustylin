const items = ['Bridal Makeup', 'Mehndi', 'Hair Styling', 'Skincare', 'Party Makeup', 'Bridal Packages'];

/**
 * Endless strip of what the salon does. The list is rendered twice so the
 * track can slide by half its width and loop without a seam; the copy is
 * hidden from screen readers. Pauses on hover, stops for reduced motion.
 */
const ServiceMarquee = () => (
  <div className="marquee overflow-hidden border-y border-border/60 py-5" aria-label="Our services">
    <div className="marquee-track flex w-max">
      {[0, 1].map(copy => (
        <ul key={copy} className="flex shrink-0" aria-hidden={copy === 1 || undefined}>
          {items.map(item => (
            <li key={item} className="flex items-center gap-10 pr-10 font-heading text-2xl md:text-3xl whitespace-nowrap">
              {item}
              <span className="text-primary text-lg" aria-hidden>✦</span>
            </li>
          ))}
        </ul>
      ))}
    </div>
  </div>
);

export default ServiceMarquee;
