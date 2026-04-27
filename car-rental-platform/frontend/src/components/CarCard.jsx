'use client';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Users, Briefcase, Star, ArrowUpRight } from 'lucide-react';
import FavoriteButton from './FavoriteButton';

// IMPORTANT: the heart button is a SIBLING of <Link>, not a child. Putting a
// <button> inside an <a> is invalid HTML, and some browsers route the click
// to the anchor (= you navigate to the detail page instead of toggling
// favorites). Sibling positioning + z-10 keeps it interactive on its own.
export default function CarCard({ car }) {
  return (
    <div className="card overflow-hidden group hover:-translate-y-0.5 hover:shadow-md transition relative">
      <Link href={`/cars/${car.id}`} className="block">
        <div className="relative h-44 sm:h-48 bg-ink-800 overflow-hidden">
          <Image
            src={car.heroImage}
            alt={`${car.make} ${car.model}`}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            className="object-cover group-hover:scale-[1.03] transition-transform duration-500"
          />
          <span className="absolute top-3 left-3 chip-light backdrop-blur-sm border border-white/15 shadow-sm">
            {car.category.toUpperCase()}
          </span>
          {typeof car.fitScore === 'number' && (
            <span className="absolute top-12 left-3 chip bg-brand-600 text-white border-brand-500 shadow-sm">
              Fit {car.fitScore}
            </span>
          )}
          <span className="absolute bottom-3 right-3 h-9 w-9 rounded-full bg-brand-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-glow">
            <ArrowUpRight size={16}/>
          </span>
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-100 truncate">
                {car.make} {car.model} <span className="text-slate-500 font-normal">{car.year}</span>
              </h3>
              <p className="text-sm text-slate-400 flex items-center gap-1 mt-0.5">
                <MapPin size={14}/> {car.city}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-lg font-bold text-slate-50">{`₹${car.price.toLocaleString()}`}</p>
              <p className="text-[11px] text-slate-500 uppercase tracking-wide">/day</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3 text-sm text-slate-300">
            <span className="flex items-center gap-1"><Users size={14}/> {car.seats}</span>
            <span className="flex items-center gap-1"><Briefcase size={14}/> {car.luggage}</span>
            <span className="flex items-center gap-1"><Star size={14} className="text-amber-400 fill-amber-400"/>{car.safetyRating.toFixed(1)}</span>
            <span className="ml-auto chip text-[11px] uppercase">{car.transmission?.[0]}</span>
          </div>
        </div>
      </Link>
      <FavoriteButton carId={car.id} className="absolute top-3 right-3 z-10"/>
    </div>
  );
}
