// Prompt text that teaches the model the scene DSL (see scene-dsl.ts and scene-recipes.ts).

import { LIMITS } from './scene-dsl';
import { RECIPE_NAMES } from './scene-recipes';

export const SCENE_PROMPT_GUIDE = `
VIDEO PENJELASAN (gaya 3Blue1Brown): 3 sampai 5 scene. SETIAP scene wajib punya panggung animasi nyata, bukan kartu teks.
Kamu menulis JSON deklaratif (bukan kode). Panggung gelap berukuran 16:9 dengan koordinat x dari -6.5 sampai 6.5 dan y dari -3.4 sampai 3.4 (0,0 = tengah).
Warna di panggung: kurva fungsi berwarna kuning keemasan (amber), garis singgung dan kurva turunan putih. Jangan menyebut warna lain (biru, merah) di narasi atau caption.
Judul scene tampil otomatis di kiri atas pada resep; pada stage kustom taruh sendiri di sekitar [-6.4, 3.25].
Narasi ("narration") dan teks pada panggung ditulis dalam bahasa pengguna. Rumus ditulis dalam LaTeX di objek "mathtex" dan boleh memakai $...$ di caption.
Pada setiap scene pilih SATU: "recipe" (nama resep + params) ATAU "stage" kustom {objects, timeline}.
"title" setiap scene WAJIB berupa frasa 2 sampai 6 kata yang menyebut isi scene (contoh: "Garis singgung bergeser"), jangan angka. Jangan memakai resep yang sama dua kali kecuali "expr"-nya berbeda; resep derivative-tangent sudah menampilkan kurva turunan di bawah kurva fungsi.

RESEP (paling aman, pilih bila cocok): {"recipe":{"name":"...","params":{...}}}. Nama: ${RECIPE_NAMES.join(', ')}.
Params (semua opsional): function-plot {expr,label,note,xRange,yRange}; derivative-tangent {expr,label,derivative,from,to,xRange,yRange}; area-riemann {expr,a,b,xRange,yRange,label};
vector-add {a:[x,y],b:[x,y]}; unit-circle {}; limit-approach {expr,a,label}; matrix-transform {matrix:[a,b,c,d]}; gradient-descent {expr,start,rate,steps,rule};
call-stack {fn,n} atau {frames:[{label,sub,ret}]} maks 6; tree-traversal {nodes:[7 label]}; pipeline {stages:[2..5 label],notes:[...]}; code-walk {code:[baris kode maks 8],steps:[penjelasan per baris]}; concept-map {center,points:[2..5 label]}; ratio {a,b}.

STAGE KUSTOM: {"objects":[...],"timeline":[...]}. Maks ${LIMITS.objects} objek, ${LIMITS.timeline} aksi. "id" unik (huruf, angka, - atau _, maks 24 karakter).
Warna hanya: "ink","amber","off-white","muted","success","danger" (default off-white). Tanpa HTML. Rumus fungsi "expr" hanya memakai x, angka, + - * / ^ ( ), sin cos tan asin acos atan sqrt exp ln log abs, pi, e (maks 80 karakter).
Objek (field "type"):
- text {text,at:[x,y],size:"sm|md|lg|xl",color,align:"left|center|right",mono,priority:"low"}  (priority "low" untuk catatan samping yang boleh pindah ke bawah panggung di layar ponsel; jangan untuk rumus utama atau label)
- mathtex {latex,at,size,color}  (LaTeX tanpa \href, \input, \def dan sejenisnya)
- axes {at,size:[lebar,tinggi],xRange:[min,max,step],yRange:[min,max,step],xLabel,yLabel,numbers,color}  ("at" = titik tengah area plot; lebar maks 13, tinggi maks 7)
- function-graph {axes:"id axes",expr,color,xRange}
- vector {from,to,axes?,color}  from/to berupa [x,y] (koordinat sumbu bila "axes" diisi) atau id sebuah dot (ikut bergerak)
- dot {at,axes?,onGraph:{graph:"id function-graph",x},color,radius,hollow}
- line {from,to,axes?,color,dashed}  (ujungnya boleh id dot)
- circle {at,radius,color,fill}, rectangle {at,size:[w,h],color,fill}, polygon {points:[[x,y],...],color,fill}
- number-line {at,length,range:[min,max,step],color,numbers}
- brace {from,to,label,color}
- box {at,size:[w,h],label,sub,color,fill,round}  (kotak berlabel untuk frame stack, simpul pohon, tahap pipeline)
- tangent {graph:"id function-graph",x,length,color,dot}
- area {graph,range:[a,b],color}, riemann {graph,range:[a,b],n,color}
- grid {at,extent,color}  (kotak-kotak untuk transformasi matriks)
- group {children:[id,...]}  (target aksi boleh id group)
Aksi pada "timeline" (urut waktu dalam detik dari awal scene, "at" + "dur", "target": id atau [id,...]):
write (tulis teks/rumus), create (gambar bentuk), fade-in, fade-out, transform (target berubah menjadi objek lain: "to":"id"), move-to ("point":[x,y]), indicate (denyut),
grow-arrow (vector tumbuh), draw-graph (kurva digambar), trace-tangent (tangent meluncur: "fromX","toX"), highlight ("color"), move-along (dot menyusuri kurva: "fromX","toX"),
orbit (dot mengitari lingkaran: "center","radius","fromDeg","toDeg"), apply-matrix ("matrix":[a,b,c,d]). Tambahkan "linear":true untuk gerak berkecepatan tetap.
Objek hanya muncul bila sebuah aksi memunculkannya (fade-in, write, create, grow-arrow, draw-graph). Urutan yang baik: judul, sumbu, kurva, label, lalu animasi inti.
"durationSeconds" scene 10 sampai 20; "at" + "dur" tidak boleh melebihi durasi. Panjang narasi menentukan durasi putar sebenarnya (sekitar 2,3 kata per detik), jadi jaga narasi 25 sampai 45 kata.
Caption memakai waktu relatif scene ("startSeconds" 0 di awal scene itu).
Contoh 1 (resep): {"id":"sc1","sceneNumber":1,"title":"Kemiringan di setiap titik","durationSeconds":16,"narration":"...","recipe":{"name":"derivative-tangent","params":{"expr":"x^2","label":"f(x) = x^2","derivative":"f'(x) = 2x"}},"captions":[{"startSeconds":0,"endSeconds":8,"text":"Garis singgung menempel pada kurva."},{"startSeconds":8,"endSeconds":16,"text":"Kemiringannya berubah mengikuti $f'(x)=2x$."}]}
Contoh 2 (kustom): {"id":"sc2","sceneNumber":2,"title":"Dua panggilan menumpuk","durationSeconds":14,"narration":"...","stage":{"objects":[{"id":"t","type":"text","text":"Call stack","at":[-6.4,3.25],"size":"md","color":"muted","align":"left"},{"id":"a","type":"box","at":[0,-1.5],"size":[4.6,0.9],"label":"f(2)","sub":"menunggu f(1)","color":"off-white","round":true},{"id":"b","type":"box","at":[0,-0.4],"size":[4.6,0.9],"label":"f(1)","sub":"base case","color":"amber","fill":true,"round":true},{"id":"ar","type":"vector","from":[3.2,-1.5],"to":[3.2,-0.4],"color":"muted"},{"id":"m","type":"mathtex","latex":"f(n)=n\\cdot f(n-1)","at":[0,1.6],"size":"lg","color":"off-white"}],"timeline":[{"do":"write","target":"t","at":0.2,"dur":1},{"do":"fade-in","target":"a","at":1.5,"dur":1},{"do":"fade-in","target":"b","at":4,"dur":1},{"do":"grow-arrow","target":"ar","at":5,"dur":1},{"do":"write","target":"m","at":6,"dur":2},{"do":"highlight","target":"b","color":"success","at":9,"dur":1.5}]},"captions":[{"startSeconds":0,"endSeconds":14,"text":"Setiap panggilan menambah satu frame."}]}`;
