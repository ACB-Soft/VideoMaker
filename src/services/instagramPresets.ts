import { InstagramPost } from '../types/video';

export interface InstagramAccountPreset {
  username: string;
  fullName: string;
  avatarUrl: string;
  bio: string;
  category: string;
  postsCount: number;
  followers: string;
  isVerified: boolean;
  posts: InstagramPost[];
}

export const MMG_ACCOUNT: InstagramAccountPreset = {
  username: 'mmgdernegi',
  fullName: 'Mimar ve Mühendisler Grubu Derneği',
  avatarUrl: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=200&auto=format&fit=crop&q=80',
  bio: '🏛️ Mimar, mühendis ve şehir plancılarının mesleki dayanışma ve vizyon platformu. Geleceği birlikte inşa ediyoruz. 📐⚡',
  category: 'Meslek Derneği & Sivil Toplum',
  postsCount: 284,
  followers: '38.5K',
  isVerified: true,
  posts: [
    {
      id: 'mmg-post-1',
      imageUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1080&auto=format&fit=crop&q=85',
      caption: 'MMG Ar-Ge & İnovasyon Zirvemiz; bakanlıklarımız, üniversitelerimiz ve sanayicilerimizin geniş katılımıyla gerçekleşti. Yerli teknoloji hamlesinde mühendislerimizin imzası var! 🚀🏗️',
      likes: 2450,
      comments: 86,
      date: '1 gün önce',
      tags: ['mmgdernegi', 'argeinovasyon', 'muhendislikzirvesi', 'yerliteknoloji'],
      author: {
        username: 'mmgdernegi',
        fullName: 'Mimar ve Mühendisler Grubu Derneği',
        avatarUrl: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=200&auto=format&fit=crop&q=80',
        isVerified: true,
      },
    },
    {
      id: 'mmg-post-2',
      imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1080&auto=format&fit=crop&q=85',
      caption: 'Deprem ve Dirençli Şehirler Çalıştayımız tamamlandı. Afetlere dayanıklı yapılar ve sürdürülebilir şehircilik ilkeleri doğrultusunda hazırladığımız raporumuzu kamuoyu ile paylaştık. 📐🏛️',
      likes: 3120,
      comments: 114,
      date: '3 gün önce',
      tags: ['direnclisehirler', 'depremguvenligi', 'sehircilik', 'mimarlik'],
      author: {
        username: 'mmgdernegi',
        fullName: 'Mimar ve Mühendisler Grubu Derneği',
        avatarUrl: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=200&auto=format&fit=crop&q=80',
        isVerified: true,
      },
    },
    {
      id: 'mmg-post-3',
      imageUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1080&auto=format&fit=crop&q=85',
      caption: 'Genç MMG Mühendislik ve Mimarlık Kariyer Buluşması! Geleceğin mimar ve mühendisleriyle tecrübe paylaşımı ve mentörlük programımızın yeni dönem açılışını gerçekleştirdik. 🎓💡',
      likes: 2890,
      comments: 72,
      date: '5 gün önce',
      tags: ['gencmmg', 'kariyerbulusmasi', 'mentorluk', 'gencmuhendisler'],
      author: {
        username: 'mmgdernegi',
        fullName: 'Mimar ve Mühendisler Grubu Derneği',
        avatarUrl: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=200&auto=format&fit=crop&q=80',
        isVerified: true,
      },
    },
    {
      id: 'mmg-post-4',
      imageUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?w=1080&auto=format&fit=crop&q=85',
      caption: 'Mega Ulaşım ve Altyapı Projesi Teknik Gezisi. Heyetimiz sahada yürütülen ileri tünel ve köprü mühendisliği tekniklerini yerinde inceledi. 🌉⚙️',
      likes: 3410,
      comments: 98,
      date: '1 hafta önce',
      tags: ['teknikgezi', 'altyapiprojeleri', 'insaatmuhendisligi', 'mmg'],
      author: {
        username: 'mmgdernegi',
        fullName: 'Mimar ve Mühendisler Grubu Derneği',
        avatarUrl: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=200&auto=format&fit=crop&q=80',
        isVerified: true,
      },
    },
    {
      id: 'mmg-post-5',
      imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1080&auto=format&fit=crop&q=85',
      caption: 'Mimar ve Mühendisler Grubu Bültenimizin "Sürdürülebilir Mimari ve Yeşil Enerji" temalı yeni sayısı yayında! Dijital kütüphanemizden ve web sitemizden erişebilirsiniz. 📖🌿',
      likes: 2150,
      comments: 46,
      date: '2 hafta önce',
      tags: ['mmgbulten', 'yesilenerji', 'surdurulebilirlik', 'dergi'],
      author: {
        username: 'mmgdernegi',
        fullName: 'Mimar ve Mühendisler Grubu Derneği',
        avatarUrl: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=200&auto=format&fit=crop&q=80',
        isVerified: true,
      },
    },
  ],
};

export const INSTAGRAM_PRESETS: InstagramAccountPreset[] = [MMG_ACCOUNT];

export async function fetchInstagramProfile(query: string): Promise<InstagramAccountPreset> {
  const clean = query.replace('@', '').trim().toLowerCase();
  
  if (clean === 'mmgdernegi' || clean.includes('mmg') || clean.includes('mimar')) {
    await new Promise(r => setTimeout(r, 400));
    return MMG_ACCOUNT;
  }

  // Dynamic profile generation for custom username
  await new Promise(r => setTimeout(r, 600));
  const cleanTitle = clean.charAt(0).toUpperCase() + clean.slice(1);

  return {
    username: clean || 'mmgdernegi',
    fullName: `${cleanTitle} — Mimarlık & Mühendislik`,
    avatarUrl: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=200&auto=format&fit=crop&q=80',
    bio: `📐 ${cleanTitle} resmi etkinlik, proje ve faaliyet sayfası.`,
    category: 'Sivil Toplum & Meslek Kuruluşu',
    postsCount: 52,
    followers: '15.2K',
    isVerified: true,
    posts: [
      {
        id: `post-${clean}-1`,
        imageUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1080&auto=format&fit=crop&q=85',
        caption: `${cleanTitle} bünyesinde gerçekleştirilen teknik çalıştay ve vizyon paneli.`,
        likes: 1340,
        comments: 42,
        date: 'Yeni',
        tags: ['mmg', 'muhendislik', clean],
        author: {
          username: clean,
          fullName: `${cleanTitle} — Mimarlık & Mühendislik`,
          avatarUrl: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=200&auto=format&fit=crop&q=80',
          isVerified: true,
        },
      },
      {
        id: `post-${clean}-2`,
        imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1080&auto=format&fit=crop&q=85',
        caption: `Kentsel tasarım ve yapı teknolojileri odaklı saha incelemelerimiz devam ediyor.`,
        likes: 1890,
        comments: 65,
        date: '2 gün önce',
        tags: ['mimarlik', 'teknoloji', clean],
        author: {
          username: clean,
          fullName: `${cleanTitle} — Mimarlık & Mühendislik`,
          avatarUrl: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=200&auto=format&fit=crop&q=80',
          isVerified: true,
        },
      },
      {
        id: `post-${clean}-3`,
        imageUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?w=1080&auto=format&fit=crop&q=85',
        caption: `Geleceğin şehirlerini ve altyapı projelerini şekillendiren mühendislik çalışmaları.`,
        likes: 2100,
        comments: 77,
        date: '4 gün önce',
        tags: ['insaat', 'altyapi', clean],
        author: {
          username: clean,
          fullName: `${cleanTitle} — Mimarlık & Mühendislik`,
          avatarUrl: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=200&auto=format&fit=crop&q=80',
          isVerified: true,
        },
      },
    ],
  };
}
