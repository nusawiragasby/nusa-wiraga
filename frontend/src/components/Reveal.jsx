import { useEffect, useRef, useState } from "react";

// Pengganti <motion.div whileInView>: memudar sambil naik saat pertama kali
// masuk layar, sekali saja. Dibuat sendiri karena pustaka animasinya jauh
// lebih berat daripada efek yang sebenarnya dipakai halaman ini.
export function Reveal({ delay = 0, className = "", children, ...rest }) {
  const ref = useRef(null);
  const [tampil, setTampil] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Browser tanpa IntersectionObserver langsung menampilkannya daripada
    // menyembunyikan konten selamanya.
    if (!("IntersectionObserver" in window)) {
      setTampil(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setTampil(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`${tampil ? "muncul" : "belum-muncul"} ${className}`}
      style={delay ? { animationDelay: `${delay}s` } : undefined} {...rest}>
      {children}
    </div>
  );
}
