import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/*
  CONFIGURAÇÃO:
  1. Crie um projeto em https://console.firebase.google.com/
  2. Adicione um app Web e copie a configuração abaixo.
  3. Ative o Cloud Firestore e crie o banco de dados.
  4. Cole os dados do seu projeto nos campos abaixo.
*/
const firebaseConfig = {
  apiKey: "AIzaSyBQNSZi6bP0WohWIaVzhukSuyyFYPMdTbU",
  authDomain: "nuvem2-melqui.firebaseapp.com",
  projectId: "nuvem2-melqui",
  storageBucket: "nuvem2-melqui.firebasestorage.app",
  messagingSenderId: "258874273037",
  appId: "1:258874273037:web:8a7fbc27aa1d5de2e4d444"
};

const configReady = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
let db = null;
if (configReady) {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
}

const $ = id => document.getElementById(id);
const form = $("clientForm");
const collectionName = "clientes";
let clients = [];
let pendingDeleteId = null;
let toastTimer;

function notify(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3500);
}

function initials(name = "") {
  return name.trim().split(/\s+/).slice(0, 2).map(p => p[0] || "").join("").toUpperCase() || "CL";
}
function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}
function locationText(c) {
  return [c.city, c.state].filter(Boolean).join(" / ") || "Não informado";
}
function addressText(c) {
  return [c.street, c.number, c.district, [c.city, c.state].filter(Boolean).join(" - ")].filter(Boolean).join(", ");
}
function showView(view) {
  document.querySelectorAll(".view").forEach(el => el.classList.remove("active"));
  $(`${view}View`).classList.add("active");
  document.querySelectorAll(".nav-item").forEach(el => el.classList.toggle("active", el.dataset.view === view));
  const labels = {dashboard:"Visão geral",clients:"Clientes",register:"Novo cadastro"};
  $("crumb").textContent = labels[view];
  if (view === "register") $("name").focus({preventScroll:true});
}
function clientRow(c, compact = false) {
  const type = c.kind || "Pessoa física";
  return `<tr>
    <td><div class="client-cell"><div class="client-avatar">${escapeHTML(initials(c.name))}</div><div><div class="client-name">${escapeHTML(c.name || "Sem nome")}</div><div class="client-detail">${escapeHTML(c.document || "Documento não informado")}</div></div></div></td>
    <td><span class="type-pill ${type === "Pessoa jurídica" ? "pj" : ""}">${escapeHTML(type)}</span></td>
    <td><div>${escapeHTML(c.email || "Sem e-mail")}</div><div class="client-detail">${escapeHTML(c.phone || "Sem telefone")}</div></td>
    <td><div>${escapeHTML(compact ? locationText(c) : (addressText(c) || "Endereço não informado"))}</div><div class="client-detail">${escapeHTML(c.cep || "")}</div></td>
    <td><div class="action-group"><button class="icon-btn" data-edit="${escapeHTML(c.id)}" title="Editar cliente" aria-label="Editar cliente">✎</button><button class="icon-btn delete" data-delete="${escapeHTML(c.id)}" title="Excluir cliente" aria-label="Excluir cliente">⌫</button></div></td>
  </tr>`;
}
function render() {
  $("totalStat").textContent = clients.length;
  $("pfStat").textContent = clients.filter(c => c.kind === "Pessoa física").length;
  $("pjStat").textContent = clients.filter(c => c.kind === "Pessoa jurídica").length;
  $("cityStat").textContent = new Set(clients.map(c => (c.city || "").trim().toLowerCase()).filter(Boolean)).size;
  $("sideCount").textContent = clients.length;
  const recent = [...clients].slice(0, 5);
  $("recentRows").innerHTML = recent.length ? recent.map(c => clientRow(c, true)).join("") : `<tr><td colspan="5" class="empty">${configReady ? "Nenhum cliente cadastrado. Comece adicionando um novo cliente." : "Configure o Firebase em app.js para carregar os cadastros."}</td></tr>`;
  renderDirectory();
}
function renderDirectory() {
  const search = $("searchInput").value.trim().toLowerCase();
  const type = $("typeFilter").value;
  const filtered = clients.filter(c => {
    const text = [c.name,c.document,c.email,c.phone,c.city,c.state,c.cep].join(" ").toLowerCase();
    return text.includes(search) && (!type || c.kind === type);
  });
  $("clientRows").innerHTML = filtered.length ? filtered.map(c => clientRow(c)).join("") : `<tr><td colspan="5" class="empty">${clients.length ? "Nenhum resultado para essa pesquisa." : (configReady ? "Ainda não há clientes cadastrados." : "Configure o Firebase em app.js para usar o banco de dados.")}</td></tr>`;
  $("resultCount").textContent = `${filtered.length} ${filtered.length === 1 ? "registro" : "registros"}`;
}
async function loadClients() {
  if (!configReady) {
    clients = [];
    render();
    notify("Configure as credenciais do Firebase no arquivo app.js.");
    return;
  }
  try {
    const snapshot = await getDocs(query(collection(db, collectionName), orderBy("createdAt", "desc")));
    clients = snapshot.docs.map(item => ({id:item.id, ...item.data()}));
  } catch (error) {
    try {
      const snapshot = await getDocs(collection(db, collectionName));
      clients = snapshot.docs.map(item => ({id:item.id, ...item.data()}));
    } catch (err) {
      console.error(err);
      notify("Não foi possível acessar o Firestore. Confira as regras e a configuração.");
      clients = [];
    }
  }
  render();
}
function clearForm() {
  form.reset();
  $("recordId").value = "";
  $("formTitle").innerHTML = 'Novo cadastro<span class="heading-dot">.</span>';
  $("saveBtn").innerHTML = 'Salvar cadastro <span>→</span>';
  $("cepFeedback").textContent = "Consulta gratuita via ViaCEP";
  $("cepFeedback").className = "cep-feedback";
}
function startNew() {
  clearForm();
  showView("register");
}
function editClient(id) {
  const c = clients.find(item => item.id === id);
  if (!c) return;
  clearForm();
  $("recordId").value = c.id;
  ["name","kind","document","email","phone","cep","street","number","complement","district","city","state","notes"].forEach(key => {
    if ($(key)) $(key).value = c[key] || "";
  });
  $("formTitle").innerHTML = 'Editar cadastro<span class="heading-dot">.</span>';
  $("saveBtn").innerHTML = 'Salvar alterações <span>→</span>';
  showView("register");
}
async function lookupCEP() {
  const cep = $("cep").value.replace(/\D/g, "");
  if (cep.length !== 8) {
    $("cepFeedback").textContent = "Digite um CEP válido com 8 números.";
    $("cepFeedback").className = "cep-feedback error";
    return;
  }
  $("lookupCep").disabled = true;
  $("lookupCep").textContent = "Buscando...";
  $("cepFeedback").textContent = "Consultando a ViaCEP...";
  $("cepFeedback").className = "cep-feedback";
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!response.ok) throw new Error("Falha na consulta");
    const data = await response.json();
    if (data.erro) throw new Error("CEP não encontrado. Confira os números.");
    $("street").value = data.logradouro || "";
    $("district").value = data.bairro || "";
    $("city").value = data.localidade || "";
    $("state").value = data.uf || "";
    $("complement").value = $("complement").value || data.complemento || "";
    $("cep").value = cep.replace(/^(\d{5})(\d{3})$/, "$1-$2");
    $("cepFeedback").textContent = `Endereço encontrado: ${data.localidade}/${data.uf}`;
    $("cepFeedback").className = "cep-feedback success";
    if (!data.logradouro) $("number").focus();
  } catch (error) {
    $("cepFeedback").textContent = error.message || "Erro ao consultar. Tente novamente.";
    $("cepFeedback").className = "cep-feedback error";
  } finally {
    $("lookupCep").disabled = false;
    $("lookupCep").textContent = "⌕ Buscar CEP";
  }
}
function formData() {
  const keys = ["name","kind","document","email","phone","cep","street","number","complement","district","city","state","notes"];
  const data = {};
  keys.forEach(key => data[key] = $(key).value.trim());
  data.cep = data.cep.replace(/\D/g, "");
  data.document = data.document.trim();
  data.updatedAt = serverTimestamp();
  return data;
}
form.addEventListener("submit", async event => {
  event.preventDefault();
  if (!configReady) {
    notify("Antes de salvar, configure seu Firebase no início de app.js.");
    return;
  }
  const id = $("recordId").value;
  const data = formData();
  const saveButton = $("saveBtn");
  saveButton.disabled = true;
  saveButton.textContent = "Salvando...";
  try {
    if (id) {
      await updateDoc(doc(db, collectionName, id), data);
      notify("Cadastro atualizado com sucesso!");
    } else {
      data.createdAt = serverTimestamp();
      await addDoc(collection(db, collectionName), data);
      notify("Cliente cadastrado com sucesso!");
    }
    clearForm();
    await loadClients();
    showView("clients");
  } catch (error) {
    console.error(error);
    notify("Erro ao salvar. Verifique a conexão e as regras do Firestore.");
  } finally {
    saveButton.disabled = false;
    saveButton.innerHTML = id ? 'Salvar alterações <span>→</span>' : 'Salvar cadastro <span>→</span>';
  }
});
document.addEventListener("click", event => {
  const edit = event.target.closest("[data-edit]");
  const del = event.target.closest("[data-delete]");
  if (edit) editClient(edit.dataset.edit);
  if (del) {
    pendingDeleteId = del.dataset.delete;
    $("confirmModal").classList.add("open");
  }
});
$("confirmDelete").addEventListener("click", async () => {
  if (!pendingDeleteId) return;
  if (!configReady) return notify("Configure o Firebase em app.js.");
  try {
    await deleteDoc(doc(db, collectionName, pendingDeleteId));
    clients = clients.filter(c => c.id !== pendingDeleteId);
    render();
    notify("Cadastro excluído com sucesso.");
  } catch (error) {
    console.error(error);
    notify("Não foi possível excluir. Confira as regras do Firestore.");
  }
  pendingDeleteId = null;
  $("confirmModal").classList.remove("open");
});
$("keepRecord").addEventListener("click", () => {
  pendingDeleteId = null;
  $("confirmModal").classList.remove("open");
});
$("confirmModal").addEventListener("click", event => {
  if (event.target === $("confirmModal")) $("confirmModal").classList.remove("open");
});
document.querySelectorAll(".nav-item").forEach(button => button.addEventListener("click", () => {
  if (button.dataset.view === "register") clearForm();
  showView(button.dataset.view);
}));
["newClientBtn","clientsNewBtn"].forEach(id => $(id).addEventListener("click", startNew));
$("seeAllBtn").addEventListener("click", () => showView("clients"));
$("cancelForm").addEventListener("click", () => { clearForm(); showView("clients"); });
$("cancelFormTop").addEventListener("click", () => { clearForm(); showView("clients"); });
$("lookupCep").addEventListener("click", lookupCEP);
$("cep").addEventListener("keydown", event => { if (event.key === "Enter") { event.preventDefault(); lookupCEP(); } });
$("cep").addEventListener("input", event => {
  const digits = event.target.value.replace(/\D/g, "").slice(0, 8);
  event.target.value = digits.length > 5 ? `${digits.slice(0,5)}-${digits.slice(5)}` : digits;
});
$("state").addEventListener("input", event => event.target.value = event.target.value.toUpperCase().slice(0,2));
$("searchInput").addEventListener("input", renderDirectory);
$("typeFilter").addEventListener("change", renderDirectory);
$("refreshBtn").addEventListener("click", loadClients);
$("seedDemoBtn").addEventListener("click", seedDemoClients);


// Dados fictícios para demonstração escolar. Os endereços são preenchidos
// consultando a ViaCEP a partir dos CEPs abaixo antes de salvar no Firestore.
const demoClients = [
  {name:"Mariana Oliveira",kind:"Pessoa física",document:"123.456.789-01",email:"mariana.oliveira@example.com",phone:"(11) 98741-2036",cep:"01001000",number:"120",complement:"Apto 34",notes:"Cliente demonstrativo"},
  {name:"Rafael Santos",kind:"Pessoa física",document:"234.567.890-12",email:"rafael.santos@example.com",phone:"(21) 98832-1045",cep:"20040002",number:"85",complement:"Sala 502",notes:"Cliente demonstrativo"},
  {name:"Comercial Horizonte Ltda.",kind:"Pessoa jurídica",document:"12.345.678/0001-90",email:"contato@horizonte.example.com",phone:"(11) 3456-7890",cep:"01310100",number:"900",complement:"Conjunto 81",notes:"Fornecedor demonstrativo"},
  {name:"Camila Ferreira",kind:"Pessoa física",document:"345.678.901-23",email:"camila.ferreira@example.com",phone:"(31) 99120-3344",cep:"30140071",number:"44",complement:"Casa",notes:"Cliente demonstrativo"},
  {name:"Nova Rota Transportes",kind:"Pessoa jurídica",document:"23.456.789/0001-01",email:"operacao@novarota.example.com",phone:"(41) 3333-2244",cep:"80010000",number:"250",complement:"Galpão 2",notes:"Fornecedor demonstrativo"},
  {name:"Lucas Almeida",kind:"Pessoa física",document:"456.789.012-34",email:"lucas.almeida@example.com",phone:"(15) 99711-8822",cep:"18200000",number:"73",complement:"",notes:"Cliente demonstrativo"},
  {name:"Ponto Certo Materiais",kind:"Pessoa jurídica",document:"34.567.890/0001-12",email:"vendas@pontocerto.example.com",phone:"(19) 3222-7788",cep:"13010000",number:"610",complement:"Loja A",notes:"Estabelecimento demonstrativo"},
  {name:"Beatriz Costa",kind:"Pessoa física",document:"567.890.123-45",email:"beatriz.costa@example.com",phone:"(51) 99220-4433",cep:"90010150",number:"16",complement:"Apto 21",notes:"Cliente demonstrativo"},
  {name:"Alfa Soluções Digitais",kind:"Pessoa jurídica",document:"45.678.901/0001-23",email:"equipe@alfasolucoes.example.com",phone:"(11) 4000-2121",cep:"04538000",number:"150",complement:"8º andar",notes:"Fornecedor demonstrativo"},
  {name:"Pedro Henrique Lima",kind:"Pessoa física",document:"678.901.234-56",email:"pedro.lima@example.com",phone:"(27) 99810-5656",cep:"29010000",number:"300",complement:"",notes:"Cliente demonstrativo"},
  {name:"Mercado Bom Vizinho",kind:"Pessoa jurídica",document:"56.789.012/0001-34",email:"compras@bomvizinho.example.com",phone:"(16) 3636-7878",cep:"14010000",number:"100",complement:"",notes:"Estabelecimento demonstrativo"},
  {name:"Ana Clara Ribeiro",kind:"Pessoa física",document:"789.012.345-67",email:"ana.ribeiro@example.com",phone:"(85) 99121-3434",cep:"60002530",number:"52",complement:"Bloco B",notes:"Cliente demonstrativo"},
  {name:"Vale Verde Distribuidora",kind:"Pessoa jurídica",document:"67.890.123/0001-45",email:"pedidos@valeverde.example.com",phone:"(62) 3222-9090",cep:"74003010",number:"440",complement:"",notes:"Fornecedor demonstrativo"},
  {name:"Gabriel Martins",kind:"Pessoa física",document:"890.123.456-78",email:"gabriel.martins@example.com",phone:"(71) 99332-2211",cep:"40015000",number:"28",complement:"Apto 12",notes:"Cliente demonstrativo"},
  {name:"Estação Café & Cia.",kind:"Pessoa jurídica",document:"78.901.234/0001-56",email:"contato@estacaocafe.example.com",phone:"(11) 3111-9090",cep:"05422001",number:"77",complement:"Loja 4",notes:"Estabelecimento demonstrativo"},
  {name:"Isabela Souza",kind:"Pessoa física",document:"901.234.567-89",email:"isabela.souza@example.com",phone:"(48) 99877-6655",cep:"88010000",number:"19",complement:"",notes:"Cliente demonstrativo"},
  {name:"Mundo Pet Comércio",kind:"Pessoa jurídica",document:"89.012.345/0001-67",email:"atendimento@mundopet.example.com",phone:"(11) 3222-4400",cep:"04002000",number:"215",complement:"",notes:"Estabelecimento demonstrativo"},
  {name:"Felipe Rodrigues",kind:"Pessoa física",document:"012.345.678-90",email:"felipe.rodrigues@example.com",phone:"(61) 99661-7722",cep:"70040902",number:"62",complement:"Bloco C",notes:"Cliente demonstrativo"},
  {name:"Prisma Escritórios",kind:"Pessoa jurídica",document:"90.123.456/0001-78",email:"reservas@prisma.example.com",phone:"(11) 3555-0101",cep:"01415000",number:"1000",complement:"Sala 15",notes:"Fornecedor demonstrativo"},
  {name:"Larissa Mendes",kind:"Pessoa física",document:"102.345.678-91",email:"larissa.mendes@example.com",phone:"(13) 99770-5566",cep:"11010000",number:"90",complement:"",notes:"Cliente demonstrativo"},
  {name:"Oficina Central",kind:"Pessoa jurídica",document:"01.234.567/0001-89",email:"oficina@central.example.com",phone:"(15) 3271-3030",cep:"18010000",number:"415",complement:"Fundos",notes:"Fornecedor demonstrativo"},
  {name:"Thiago Nascimento",kind:"Pessoa física",document:"213.456.789-02",email:"thiago.nascimento@example.com",phone:"(81) 99118-2424",cep:"50010000",number:"31",complement:"",notes:"Cliente demonstrativo"},
  {name:"Papelaria Girassol",kind:"Pessoa jurídica",document:"11.222.333/0001-44",email:"vendas@girassol.example.com",phone:"(11) 3333-7878",cep:"02010000",number:"70",complement:"Loja 2",notes:"Estabelecimento demonstrativo"},
  {name:"Vitória Carvalho",kind:"Pessoa física",document:"324.567.890-13",email:"vitoria.carvalho@example.com",phone:"(92) 99344-1212",cep:"69005070",number:"12",complement:"Apto 7",notes:"Cliente demonstrativo"},
  {name:"Logística Caminho Sul",kind:"Pessoa jurídica",document:"22.333.444/0001-55",email:"contato@caminhosul.example.com",phone:"(47) 3030-1212",cep:"89010000",number:"500",complement:"Armazém 1",notes:"Fornecedor demonstrativo"}
];

async function seedDemoClients() {
  if (!configReady || !db) {
    notify("Firebase não está configurado. Confira o app.js.");
    return;
  }

  const button = $("seedDemoBtn");
  button.disabled = true;
  button.textContent = "Preparando cadastros...";
  let created = 0;
  let skipped = 0;
  let failed = 0;

  try {
    // Atualiza a lista antes da importação e evita duplicar exemplos pelo e-mail.
    await loadClients();
    const existingEmails = new Set(clients.map(c => String(c.email || "").toLowerCase()));

    for (const sample of demoClients.slice(0, 5)) {
      if (existingEmails.has(sample.email.toLowerCase())) {
        skipped++;
        continue;
      }

      let address = {};
      try {
        const response = await fetch(`https://viacep.com.br/ws/${sample.cep}/json/`);
        if (response.ok) {
          const result = await response.json();
          if (!result.erro) address = result;
        }
      } catch (error) {
        // A indisponibilidade da ViaCEP não impede o cadastro do cliente.
        console.warn("ViaCEP indisponível para", sample.cep, error);
      }

      const payload = {
        ...sample,
        street: address.logradouro || "",
        district: address.bairro || "",
        city: address.localidade || "",
        state: address.uf || "",
        cep: sample.cep,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      try {
        await addDoc(collection(db, collectionName), payload);
        created++;
        existingEmails.add(sample.email.toLowerCase());
      } catch (error) {
        failed++;
        console.error("Falha ao gravar cliente no Firestore:", sample.name, error);
      }
      button.textContent = `Cadastrando... ${created + skipped + failed}/5`;
    }

    await loadClients();
    if (failed > 0) {
      notify(`${created} clientes cadastrados; ${failed} falharam. Abra o Console (F12) para ver o erro.`);
    } else if (created === 0 && skipped > 0) {
      notify("Os exemplos já estavam cadastrados. Atualizei a lista.");
    } else {
      notify(`${created} clientes cadastrados com sucesso${skipped ? `; ${skipped} já existiam` : ""}.`);
    }
  } catch (error) {
    console.error("Erro na carga de exemplos:", error);
    notify("Erro ao importar clientes. Confira as regras do Firestore e o Console (F12).");
  } finally {
    button.disabled = false;
    button.textContent = "＋ Carregar 5 exemplos";
  }
}

render();
if (configReady) loadClients();
else {
  $("recentRows").innerHTML = `<tr><td colspan="5" class="empty">Configure o Firebase em app.js para conectar o banco de dados.</td></tr>`;
  $("clientRows").innerHTML = `<tr><td colspan="5" class="empty">Configure o Firebase em app.js para conectar o banco de dados.</td></tr>`;
  $("resultCount").textContent = "Aguardando configuração do Firebase";
}
