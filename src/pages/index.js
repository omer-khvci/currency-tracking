"use client"
import Head from "next/head";
import { Geist, Geist_Mono } from "next/font/google";
import styles from "@/styles/Home.module.css";
import { useEffect, useState, useRef } from "react";
import MultiplierCoefficientEnum from "@/enums/MultiplierCoefficientEnum";
import { io } from "socket.io-client";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function Home() {
  const [calculatedGoldPrices, setCalculatedGoldPrices] = useState([]);
  const socketRef = useRef(null);
  const lastUpdateTimeRef = useRef(0);
  const latestDataRef = useRef(null);

  // Önceki geçerli verileri saklayacak referans
  const previousValidDataRef = useRef({
    ALTIN: null,
    EURTRY: null,
    USDTRY: null
  });

  useEffect(() => {
    // Socket bağlantısını oluşturma
    socketRef.current = io("https://socketweb.haremaltin.com", {
      path: "/socket.io",
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    // Bağlantı başarılı olduğunda
    socketRef.current.on("connect", () => {
    });

    // price_changed olayını dinle
    socketRef.current.on("price_changed", (data) => {
      // Her zaman en son veriyi saklayalım
      latestDataRef.current = data;

      // Şimdi kontrol edelim - 15 saniye geçmiş mi?
      const currentTime = Date.now();
      if (currentTime - lastUpdateTimeRef.current >= 5000) {
        processData(data);
        lastUpdateTimeRef.current = currentTime;
      }
    });

    // 15 saniyede bir zorla güncelleme için zamanlayıcı
    const intervalId = setInterval(() => {
      if (latestDataRef.current) {
        processData(latestDataRef.current);
        lastUpdateTimeRef.current = Date.now();
      }
    }, 5000);

    // Bağlantı hatası
    socketRef.current.on("connect_error", (err) => {
      console.error("Socket bağlantı hatası:", err.message);
    });

    // Temizlik fonksiyonu
    return () => {
      clearInterval(intervalId);
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Gelen veriyi işleme fonksiyonu
  const processData = (data) => {
    if (data && data.data) {
      // Gelen verileri alalım
      const currentGoldData = data.data["ALTIN"];
      const currentEuroData = data.data["EURTRY"];
      const currentDolarData = data.data["USDTRY"];

      // Önceki verileri saklayalım veya güncelleyelim
      if (currentGoldData && isValidData(currentGoldData)) {
        previousValidDataRef.current.ALTIN = currentGoldData;
      }

      if (currentEuroData && isValidData(currentEuroData)) {
        previousValidDataRef.current.EURTRY = currentEuroData;
      }

      if (currentDolarData && isValidData(currentDolarData)) {
        previousValidDataRef.current.USDTRY = currentDolarData;
      }

      // Artık işleme için kullanılacak veriler
      const goldData = previousValidDataRef.current.ALTIN;
      const euroData = previousValidDataRef.current.EURTRY;
      const dolarData = previousValidDataRef.current.USDTRY;

      // Tüm gerekli veriler mevcut mu?
      if (goldData && euroData && dolarData) {
        const goldSellPrice = parseFloat(goldData.satis);
        const goldBuyPrice = parseFloat(goldData.alis);
        const euroSellPrice = parseFloat(euroData.satis);
        const euroBuyPrice = parseFloat(euroData.alis);
        const dolarSellPrice = parseFloat(dolarData.satis);
        const dolarBuyPrice = parseFloat(dolarData.alis);

        const goldPrices = [
          {
            name: "Euro",
            multiplier: MultiplierCoefficientEnum.YirmiDortGramAltinSatis,
            priceSell: (euroSellPrice + MultiplierCoefficientEnum.EuroSatis).toLocaleString('tr-TR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }),
            priceBuy: (euroBuyPrice - MultiplierCoefficientEnum.EuroAlis).toLocaleString('tr-TR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }),
            sellDirection: euroData.dir?.satis_dir || "neutral",
            buyDirection: euroData.dir?.alis_dir || "neutral"
          },
          {
            name: "Dolar",
            multiplier: MultiplierCoefficientEnum.YirmiDortGramAltinSatis,
            priceSell: (dolarSellPrice + MultiplierCoefficientEnum.UsdSatis).toLocaleString('tr-TR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }),
            priceBuy: (dolarBuyPrice - MultiplierCoefficientEnum.UsdAlis).toLocaleString('tr-TR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }),
            sellDirection: dolarData.dir?.satis_dir || "neutral",
            buyDirection: dolarData.dir?.alis_dir || "neutral"

          },
          {
            name: "24 Ayar Gram Altın",
            multiplier: MultiplierCoefficientEnum.YirmiDortGramAltinSatis,
            priceSell: (goldSellPrice * MultiplierCoefficientEnum.YirmiDortGramAltinSatis).toLocaleString('tr-TR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }),
            priceBuy: (goldBuyPrice * MultiplierCoefficientEnum.YirmiDortGramAltinAlis).toLocaleString('tr-TR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }),
            sellDirection: goldData.dir?.satis_dir || "neutral",
            buyDirection: goldData.dir?.alis_dir || "neutral"
          },
          {
            name: "Bilezik",
            multiplier: MultiplierCoefficientEnum.BilezikSatis,
            priceSell: (goldSellPrice * MultiplierCoefficientEnum.BilezikSatis).toLocaleString('tr-TR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }),
            priceBuy: (goldBuyPrice * MultiplierCoefficientEnum.BilezikAlis).toLocaleString('tr-TR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }),
            sellDirection: goldData.dir?.satis_dir || "neutral",
            buyDirection: goldData.dir?.alis_dir || "neutral"
          },
          {
            name: "Ziynet Çeyrek",
            multiplier: MultiplierCoefficientEnum.ZiynetCeyrekSatis,
            priceSell: (goldSellPrice * MultiplierCoefficientEnum.ZiynetCeyrekSatis).toLocaleString('tr-TR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }),
            priceBuy: (goldBuyPrice * MultiplierCoefficientEnum.ZiynetCeyrekAlis).toLocaleString('tr-TR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }),
            sellDirection: goldData.dir?.satis_dir || "neutral",
            buyDirection: goldData.dir?.alis_dir || "neutral"
          },
          {
            name: "Ziynet Yarım",
            multiplier: MultiplierCoefficientEnum.ZiynetYarimSatis,
            priceSell: (goldSellPrice * MultiplierCoefficientEnum.ZiynetYarimSatis).toLocaleString('tr-TR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }),
            priceBuy: (goldBuyPrice * MultiplierCoefficientEnum.ZiynetYarimAlis).toLocaleString('tr-TR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }),
            sellDirection: goldData.dir?.satis_dir || "neutral",
            buyDirection: goldData.dir?.alis_dir || "neutral"
          },
          {
            name: "Ziynet Tam",
            multiplier: MultiplierCoefficientEnum.ZiynetTamSatis,
            priceSell: (goldSellPrice * MultiplierCoefficientEnum.ZiynetTamSatis).toLocaleString('tr-TR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }),
            priceBuy: (goldBuyPrice * MultiplierCoefficientEnum.ZiynetTamAlis).toLocaleString('tr-TR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }),
            sellDirection: goldData.dir?.satis_dir || "neutral",
            buyDirection: goldData.dir?.alis_dir || "neutral"
          },
          {
            name: "Ata Çeyrek",
            multiplier: MultiplierCoefficientEnum.AtaCeyrekSatis,
            priceSell: (goldSellPrice * MultiplierCoefficientEnum.AtaCeyrekSatis).toLocaleString('tr-TR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }),
            priceBuy: (goldBuyPrice * MultiplierCoefficientEnum.AtaCeyrekAlis).toLocaleString('tr-TR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }),
            sellDirection: goldData.dir?.satis_dir || "neutral",
            buyDirection: goldData.dir?.alis_dir || "neutral"
          },
          {
            name: "Ata Yarım",
            multiplier: MultiplierCoefficientEnum.AtaYarimSatis,
            priceSell: (goldSellPrice * MultiplierCoefficientEnum.AtaYarimSatis).toLocaleString('tr-TR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }),
            priceBuy: (goldBuyPrice * MultiplierCoefficientEnum.AtaYarimAlis).toLocaleString('tr-TR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }),
            sellDirection: goldData.dir?.satis_dir || "neutral",
            buyDirection: goldData.dir?.alis_dir || "neutral"
          },
          {
            name: "Ata Tam",
            multiplier: MultiplierCoefficientEnum.AtaTamSatis,
            priceSell: (goldSellPrice * MultiplierCoefficientEnum.AtaTamSatis).toLocaleString('tr-TR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }),
            priceBuy: (goldBuyPrice * MultiplierCoefficientEnum.AtaTamAlis).toLocaleString('tr-TR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }),
            sellDirection: goldData.dir?.satis_dir || "neutral",
            buyDirection: goldData.dir?.alis_dir || "neutral"
          },
          {
            name: "Reşat Tam",
            multiplier: MultiplierCoefficientEnum.ResatTamSatis,
            priceSell: (goldSellPrice * MultiplierCoefficientEnum.ResatTamSatis).toLocaleString('tr-TR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }),
            priceBuy: (goldBuyPrice * MultiplierCoefficientEnum.ResatTamAlis).toLocaleString('tr-TR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }),
            sellDirection: goldData.dir?.satis_dir || "neutral",
            buyDirection: goldData.dir?.alis_dir || "neutral"
          },
          {
            name: "2.5 Reşat",
            multiplier: MultiplierCoefficientEnum.IkiBucukResatSatis,
            priceSell: (goldSellPrice * MultiplierCoefficientEnum.IkiBucukResatSatis).toLocaleString('tr-TR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }),
            priceBuy: (goldBuyPrice * MultiplierCoefficientEnum.IkiBucukResatAlis).toLocaleString('tr-TR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }),
            sellDirection: goldData.dir?.satis_dir || "neutral",
            buyDirection: goldData.dir?.alis_dir || "neutral"
          },
          {
            name: "5'li Reşat",
            multiplier: MultiplierCoefficientEnum.BesliResatSatis,
            priceSell: (goldSellPrice * MultiplierCoefficientEnum.BesliResatSatis).toLocaleString('tr-TR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }),
            priceBuy: (goldBuyPrice * MultiplierCoefficientEnum.BesliResatAlis).toLocaleString('tr-TR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }),
            sellDirection: goldData.dir?.satis_dir || "neutral",
            buyDirection: goldData.dir?.alis_dir || "neutral"
          }
        ];

        setCalculatedGoldPrices(goldPrices);
      }
    }
  };

  // Veri geçerli mi kontrol et
  const isValidData = (data) => {
    if (!data) return false;
    if (!data.satis || !data.alis) return false;

    const sellPrice = parseFloat(data.satis);
    const buyPrice = parseFloat(data.alis);

    return !isNaN(sellPrice) && !isNaN(buyPrice) && sellPrice > 0 && buyPrice > 0;
  };

  return (
      <div className={`${styles.container} ${geistSans.variable} ${geistMono.variable}`}>
        <Head>
          <title>Altın Fiyatları</title>
          <meta name="description" content="Anlık altın fiyatları" />
          <link rel="icon" href="/favicon.ico" />
        </Head>

        <main className={styles.main}>
          {/* Son güncelleme zamanını göster */}
          {calculatedGoldPrices.length > 0 && (
              <div className={styles.lastUpdate}>
                Son güncelleme: {new Date(lastUpdateTimeRef.current).toLocaleTimeString('tr-TR')}
              </div>
          )}

          {/* Burada fiyat verilerini görüntüleyin */}
          {calculatedGoldPrices.length > 0 ? (
              <div className={styles.priceGrid}>
                {/* Fiyat verileri gösterimi */}
                {calculatedGoldPrices.map((item, index) => (
                    <div key={index} className={styles.priceCard}>
                      <p className={styles.deneme} style={{fontSize: '25px', fontWeight:'bold'}}>{item.name}</p>
                      <div className={styles.priceInfo}>
                        <p style={{fontSize:'20px', fontWeight:'bold'}} className={`${styles.priceValue} ${
                            item.buyDirection === "up"
                                ? styles.priceUp
                                : item.buyDirection === "down"
                                    ? styles.priceDown
                                    : ""
                        }`}><span>Alış:</span> {item.priceBuy} TL</p>
                        <p style={{fontSize:'20px', fontWeight:'bold'}} className={`${styles.priceValue} ${
                            item.sellDirection === "up"
                                ? styles.priceUp
                                : item.sellDirection === "down"
                                    ? styles.priceDown
                                    : ""
                        }`}
                        ><span>Satış:</span> {item.priceSell} TL</p>
                      </div>
                    </div>
                ))}
              </div>
          ) : (
              <div className={styles.loading}>
                <p>Veriler yükleniyor...</p>
              </div>
          )}
        </main>
      </div>
  );
}