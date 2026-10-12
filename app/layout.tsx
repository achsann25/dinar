import type {Metadata} from 'next';
export const metadata:Metadata={title:'STAF YONPOMAD | Portal Dokumen & Informasi Satuan',description:'STAF YONPOMAD: portal informasi dan pengelolaan dokumen Staf Intel, Operasional, Personalia, dan Logistik.',robots:{index:true,follow:true}};
export default function Layout({children}:Readonly<{children:React.ReactNode}>){return <html lang="id"><body style={{margin:0}}>{children}</body></html>;}
