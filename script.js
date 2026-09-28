const DEFAULT_CATEGORIES = {

    income: [
        "Salário",
        "Freelance",
        "Investimentos",
        "Outras receitas"
    ],

    expense: [
        "Alimentação",
        "Moradia",
        "Transporte",
        "Saúde",
        "Lazer",
        "Compras",
        "Educação",
        "Contas",
        "Outros"
    ]

};

const CATEGORY_STORAGE_KEY = "financas_pessoais_categorias";
let categories = JSON.parse(
    localStorage.getItem(CATEGORY_STORAGE_KEY) ||
    JSON.stringify(DEFAULT_CATEGORIES)
);

function saveCategories() {
    localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(categories));
}


const STORAGE_KEY =
    "financas_pessoais_lancamentos";


let transactions =
    JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "[]"
    );


const $ = id =>
    document.getElementById(id);


function money(value) {

    return value.toLocaleString(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL"
        }
    );

}


function today() {

    return new Date()
        .toISOString()
        .slice(0, 10);

}


function currentMonth() {

    return new Date()
        .toISOString()
        .slice(0, 7);

}


function save() {

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(transactions)
    );

}


/* FILTRAR POR MÊS */

function filteredTransactions() {

    const month =
        $("month-filter").value;


    if (!month) {

        return transactions;

    }


    return transactions.filter(
        transaction =>
            transaction.date.startsWith(month)
    );

}


/* CATEGORIAS DO FORMULÁRIO */

function updateCategoryOptions() {

    const type =
        document.querySelector(
            'input[name="type"]:checked'
        ).value;


    $("category").innerHTML =
        categories[type]
            .map(category => `
                <option value="${category}">
                    ${category}
                </option>
            `)
            .join("");

    const statusLabel = $("confirmed-status-label");
    if (statusLabel) {
        statusLabel.textContent = type === "income" ? "Recebido" : "Pago";
    }

}


/* ABRIR MODAL */

let editingTransactionId = null;

function openModal(transaction = null) {

    editingTransactionId = transaction ? transaction.id : null;

    $("modal")
        .classList
        .remove("hidden");


    $("transaction-form").reset();

    $("transaction-modal-title").textContent = transaction
        ? "Editar lançamento"
        : "Novo lançamento";


    $("date").value =
        today();


    updateCategoryOptions();

    if (transaction) {
        const typeRadio = document.querySelector(`input[name="type"][value="${transaction.type}"]`);
        if (!typeRadio) {
            alert("Não foi possível identificar se este lançamento é receita ou despesa.");
            closeModal();
            return;
        }
        typeRadio.checked = true;
        updateCategoryOptions();
        $("description").value = transaction.description ?? transaction.descricao ?? "";
        $("value").value = transaction.value == null ? "" : money(Number(transaction.value));
        $("date").value = transaction.date ?? "";
        $("category").value = transaction.category ?? "";
        $("note").value = transaction.note || "";
        $("transaction-status").value = transaction.status || "confirmed";
    }

}

function parseCurrencyInput(value) {
    const cents = String(value).replace(/\D/g, "");
    return cents ? Number(cents) / 100 : 0;
}


/* FECHAR MODAL */

function closeModal() {

    $("modal")
        .classList
        .add("hidden");

}


/* DASHBOARD */

function renderDashboard() {

    const data =
        filteredTransactions();


    const income =
        data
            .filter(t => t.type === "income")
            .reduce(
                (sum, t) =>
                    sum + t.value,
                0
            );


    const expense =
        data
            .filter(t => t.type === "expense")
            .reduce(
                (sum, t) =>
                    sum + t.value,
                0
            );


    const balance =
        income - expense;


    $("balance").textContent =
        money(balance);


    $("income").textContent =
        money(income);


    $("expense").textContent =
        money(expense);


    $("count").textContent =
        data.length;


    renderIncomeExpenseChart(data);

    renderCategoryChart(data);

    renderRecent(data);

}


/* GRÁFICO MENSAL */

function renderIncomeExpenseChart(data) {
    const totals = {
        income: data
            .filter(transaction => transaction.type === "income")
            .reduce((sum, transaction) => sum + transaction.value, 0),
        expense: data
            .filter(transaction => transaction.type === "expense")
            .reduce((sum, transaction) => sum + transaction.value, 0)
    };

    const total = totals.income + totals.expense;
    if (!total) {
        $("income-expense-chart").innerHTML =
            '<div class="empty">Nenhum lançamento neste período.</div>';
        return;
    }

    const incomePercentage = (totals.income / total) * 100;
    const gradient = `#16a34a 0% ${incomePercentage}%, #dc2626 ${incomePercentage}% 100%`;
    const items = [
        { label: "Receitas", value: totals.income, color: "#16a34a" },
        { label: "Despesas", value: totals.expense, color: "#dc2626" }
    ];

    $("income-expense-chart").innerHTML = `
        <div class="donut-container">
            <div class="donut" style="background: conic-gradient(${gradient})">
                <div class="donut-center">
                    <strong>${money(total)}</strong>
                    <span>Movimentado</span>
                </div>
            </div>
            <div class="donut-legend">
                ${items.map(item => `
                    <div class="legend-item">
                        <div class="legend-name">
                            <span class="legend-color" style="background:${item.color}"></span>
                            <span>${item.label}</span>
                        </div>
                        <div class="legend-value">
                            ${money(item.value)}
                            <small>${((item.value / total) * 100).toFixed(1)}%</small>
                        </div>
                    </div>
                `).join("")}
            </div>
        </div>`;
}

function renderMonthlyChart() {

    const months = [];

    const now = new Date();


    for (
        let i = 5;
        i >= 0;
        i--
    ) {

        const date =
            new Date(
                now.getFullYear(),
                now.getMonth() - i,
                1
            );


        months.push({

            key:
                `${date.getFullYear()}-${String(
                    date.getMonth() + 1
                ).padStart(2, "0")}`,

            label:
                date
                    .toLocaleDateString(
                        "pt-BR",
                        {
                            month: "short"
                        }
                    )
                    .replace(".", "")

        });

    }


    const values =
        months.map(month => {

            const list =
                transactions.filter(
                    transaction =>
                        transaction.date
                            .startsWith(month.key)
                );


            return {

                ...month,

                income:
                    list
                        .filter(
                            t =>
                                t.type === "income"
                        )
                        .reduce(
                            (sum, t) =>
                                sum + t.value,
                            0
                        ),

                expense:
                    list
                        .filter(
                            t =>
                                t.type === "expense"
                        )
                        .reduce(
                            (sum, t) =>
                                sum + t.value,
                            0
                        )

            };

        });


    const max =
        Math.max(
            1,
            ...values.flatMap(
                value => [
                    value.income,
                    value.expense
                ]
            )
        );


    $("monthly-chart").innerHTML =
        values
            .map(value => `

                <div class="month-column">

                    <div
                        class="bar income"
                        title="Receitas: ${money(
                            value.income
                        )}"
                        style="
                            height:
                            ${Math.max(
                                2,
                                value.income /
                                max * 190
                            )}px
                        ">
                    </div>

                    <div
                        class="bar expense"
                        title="Despesas: ${money(
                            value.expense
                        )}"
                        style="
                            height:
                            ${Math.max(
                                2,
                                value.expense /
                                max * 190
                            )}px
                        ">
                    </div>

                    <span class="month-label">
                        ${value.label}
                    </span>

                </div>

            `)
            .join("");

}


/* GRÁFICO DONUT POR CATEGORIA */

function renderCategoryChart(data) {

    const expenses =
        data.filter(
            transaction =>
                transaction.type === "expense"
        );


    const grouped = {};


    expenses.forEach(transaction => {

        grouped[transaction.category] =
            (
                grouped[transaction.category] ||
                0
            ) + transaction.value;

    });


    const list =
        Object.entries(grouped)
            .sort(
                (a, b) =>
                    b[1] - a[1]
            );


    if (!list.length) {

        $("category-chart").innerHTML = `
            <div class="empty">
                Nenhuma despesa registrada.
            </div>
        `;

        return;

    }


    const total =
        list.reduce(
            (sum, item) =>
                sum + item[1],
            0
        );


    /* CORES DO DONUT */

    const colors = [

        "#2563eb",
        "#16a34a",
        "#f59e0b",
        "#dc2626",
        "#9333ea",
        "#0891b2",
        "#475569",
        "#ea580c",
        "#db2777"

    ];


    /* MONTA AS FATIAS */

    let current = 0;


    const slices =
        list.map(
            ([category, value], index) => {

                const percentage =
                    (value / total) * 100;


                const start =
                    current;


                current += percentage;


                return `
                    ${colors[index % colors.length]}
                    ${start}%
                    ${current}%
                `;

            }
        );


    const gradient =
        slices.join(", ");


    /* MONTA O GRÁFICO */

    $("category-chart").innerHTML = `

        <div class="donut-container">


            <!-- DONUT -->

            <div
                class="donut"
                style="
                    background:
                    conic-gradient(
                        ${gradient}
                    );
                "
            >

                <div class="donut-center">

                    <strong>
                        ${money(total)}
                    </strong>

                    <span>
                        Total
                    </span>

                </div>

            </div>


            <!-- LEGENDA -->

            <div class="donut-legend">

                ${list.map(
                    ([category, value], index) => {

                        const percentage =
                            (value / total) * 100;


                        return `

                            <div class="legend-item">

                                <div class="legend-name">

                                    <span
                                        class="legend-color"
                                        style="
                                            background:
                                            ${colors[index % colors.length]};
                                        ">
                                    </span>

                                    <span>
                                        ${category}
                                    </span>

                                </div>


                                <div class="legend-value">

                                    ${money(value)}

                                    <small>
                                        ${percentage.toFixed(1)}%
                                    </small>

                                </div>

                            </div>

                        `;

                    }
                ).join("")}

            </div>

        </div>

    `;

}


/* ÚLTIMOS LANÇAMENTOS */

function renderRecent(data) {

    const list =
        [...data]
            .sort(
                (a, b) =>
                    b.date.localeCompare(a.date)
            )
            .slice(0, 6);


    if (!list.length) {

        $("recent-list").innerHTML = `
            <div class="empty">
                Nenhum lançamento neste período.
            </div>
        `;

        return;

    }


    $("recent-list").innerHTML =
        list
            .map(transactionHTML)
            .join("");

}


function transactionHTML(transaction) {

    return `

        <div class="transaction-row">

            <span class="muted">
                ${
                    new Date(
                        transaction.date +
                        "T12:00:00"
                    )
                    .toLocaleDateString(
                        "pt-BR"
                    )
                }
            </span>


            <span class="transaction-description">
                ${transaction.description}
            </span>


            <span class="muted">
                ${transaction.category}
            </span>


            <span
                class="${
                    transaction.type
                }-text">

                ${
                    transaction.type === "income"
                    ? "Receita"
                    : "Despesa"
                }

            </span>


            <span
                class="${
                    transaction.type
                }-text">

                ${
                    transaction.type === "income"
                    ? "+"
                    : "−"
                }

                ${money(transaction.value)}

            </span>


            <button
                class="delete-button"
                onclick="
                    removeTransaction(
                        '${transaction.id}'
                    )
                ">

                ×

            </button>

        </div>

    `;

}


/* TABELA */

function renderTable() {

    const list =
        [...transactions]
            .sort(
                (a, b) =>
                    b.date.localeCompare(a.date)
            );


    if (!list.length) {

        $("transactions-table").innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty">
                        Nenhum lançamento cadastrado.
                    </div>
                </td>
            </tr>
        `;

        return;

    }


    $("transactions-table").innerHTML =
        list
            .map(
                transaction => `

                <tr>

                    <td>

                        ${
                            new Date(
                                transaction.date +
                                "T12:00:00"
                            )
                            .toLocaleDateString(
                                "pt-BR"
                            )
                        }

                    </td>


                    <td>

                        <strong>
                            ${
                                transaction.description
                            }
                        </strong>

                    </td>


                    <td>

                        ${
                            transaction.category
                        }

                    </td>


                    <td>

                        <span
                            class="
                                badge
                                ${
                                    transaction.type
                                }
                            ">

                            ${
                                transaction.type ===
                                "income"
                                ?
                                "Receita"
                                :
                                "Despesa"
                            }

                        </span>

                    </td>


                    <td
                        class="
                            ${
                                transaction.type
                            }-text
                        ">

                        ${
                            transaction.type ===
                            "income"
                            ?
                            "+"
                            :
                            "−"
                        }

                        ${money(transaction.value)}

                    </td>


                    <td>

                        <button
                            type="button"
                            class="edit-transaction-button"
                            data-edit-transaction="${transaction.id}">
                            Editar
                        </button>

                        <button
                            class="delete-button"
                            onclick="
                                removeTransaction(
                                    '${transaction.id}'
                                )
                            ">

                            ×

                        </button>

                    </td>

                </tr>

            `
            )
            .join("");

}


/* CATEGORIAS */

function renderCategories() {
    const allCategories = [
        ...categories.income.map(name => ({ name, type: "income" })),
        ...categories.expense.map(name => ({ name, type: "expense" }))
    ];

    if (!allCategories.length) {
        $("categories-grid").innerHTML = '<div class="empty">Nenhuma categoria cadastrada.</div>';
        return;
    }

    $("categories-grid").innerHTML = allCategories.map(category => {
        const count = transactions.filter(t => t.category === category.name).length;
        const typeLabel = category.type === "income" ? "Receita" : "Despesa";
        const safeName = escapeHTML(category.name);

        return `
            <div class="category-card">
                <div class="category-info">
                    <strong>${safeName}</strong>
                    <span>${typeLabel} · ${count} lançamento(s)</span>
                </div>
                <div class="category-actions">
                    <button class="edit-category-button" data-action="edit" data-name="${safeName}" data-type="${category.type}">Editar</button>
                    <button class="delete-button" data-action="delete" data-name="${safeName}" data-type="${category.type}" aria-label="Excluir ${safeName}">×</button>
                </div>
            </div>`;
    }).join("");
}

function escapeHTML(text) {
    return String(text).replace(/[&<>"']/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
}

let editingCategory = null;

function openCategoryModal(category = null) {
    editingCategory = category;
    $("category-form").reset();
    $("category-modal-title").textContent = category ? "Editar categoria" : "Nova categoria";
    if (category) {
        $("category-name").value = category.name;
        $("category-type").value = category.type;
    }
    $("category-modal").classList.remove("hidden");
    $("category-name").focus();
}

function closeCategoryModal() {
    $("category-modal").classList.add("hidden");
}

function saveCategory(event) {
    event.preventDefault();
    const name = $("category-name").value.trim();
    const type = $("category-type").value;
    if (!name) return;

    const exists = ["income", "expense"].some(categoryType =>
        categories[categoryType].some(existing =>
            existing.toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR") &&
            !(editingCategory && editingCategory.type === categoryType && editingCategory.name === existing)
        )
    );
    if (exists) {
        alert("Já existe uma categoria com esse nome.");
        return;
    }

    if (editingCategory) {
        const { name: oldName, type: oldType } = editingCategory;
        categories[oldType] = categories[oldType].filter(item => item !== oldName);
        categories[type].push(name);
        transactions.forEach(transaction => {
            if (transaction.category === oldName) transaction.category = name;
        });
        save();
    } else {
        categories[type].push(name);
    }

    saveCategories();
    closeCategoryModal();
    updateCategoryOptions();

    renderAll();
}

function deleteCategory(name, type) {
    if (transactions.some(transaction => transaction.category === name)) {
        alert("Essa categoria está sendo usada em lançamentos. Edite esses lançamentos antes de excluí-la.");
        return;
    }
    if (!confirm(`Excluir a categoria "${name}"?`)) return;
    categories[type] = categories[type].filter(item => item !== name);
    saveCategories();
    updateCategoryOptions();
    renderAll();
}


/* EXCLUIR */

function removeTransaction(id) {

    transactions =
        transactions.filter(
            transaction =>
                transaction.id !== id
        );


    save();

    renderAll();

}


/* RENDERIZA TUDO */

function renderAll() {

    renderDashboard();

    renderTable();

    renderCategories();

    renderCashflow();

}

function renderCashflow() {
    const ordered = [...transactions].sort((a, b) =>
        a.date.localeCompare(b.date) || (a.id || "").localeCompare(b.id || "")
    );

    const confirmedBalance = ordered.reduce((balance, transaction) => {
        if (transaction.status === "pending") return balance;
        return balance + (transaction.type === "income" ? transaction.value : -transaction.value);
    }, 0);

    const pendingCount = ordered.filter(transaction => transaction.status === "pending").length;
    const forecastBalance = ordered.reduce((balance, transaction) =>
        balance + (transaction.type === "income" ? transaction.value : -transaction.value), 0
    );

    $("cashflow-confirmed").textContent = money(confirmedBalance);
    $("cashflow-forecast").textContent = money(forecastBalance);
    $("cashflow-pending").textContent = pendingCount;

    if (!ordered.length) {
        $("cashflow-table").innerHTML = `
            <tr><td colspan="7"><div class="empty">Nenhum lançamento cadastrado.</div></td></tr>`;
        return;
    }

    let runningBalance = 0;
    $("cashflow-table").innerHTML = ordered.map(transaction => {
        const signedValue = transaction.type === "income" ? transaction.value : -transaction.value;
        runningBalance += signedValue;
        const isConfirmed = transaction.status !== "pending";
        const statusLabel = isConfirmed
            ? (transaction.type === "income" ? "Recebido" : "Pago")
            : "Pendente";
        const actionLabel = isConfirmed
            ? "Reabrir"
            : (transaction.type === "income" ? "Confirmar recebimento" : "Confirmar pagamento");

        return `
            <tr>
                <td>${new Date(transaction.date + "T12:00:00").toLocaleDateString("pt-BR")}</td>
                <td><strong>${escapeHTML(transaction.description)}</strong></td>
                <td>${escapeHTML(transaction.category)}</td>
                <td class="${transaction.type}-text">${transaction.type === "income" ? "+" : "−"}${money(transaction.value)}</td>
                <td><span class="status-badge ${isConfirmed ? "confirmed" : "pending"}">${statusLabel}</span></td>
                <td class="${runningBalance < 0 ? "expense-text" : "income-text"}">${money(runningBalance)}</td>
                <td><button class="cashflow-action" data-transaction-id="${transaction.id}">${actionLabel}</button></td>
            </tr>`;
    }).join("");
}


/* NAVEGAÇÃO */

function switchSection(section) {

    document
        .querySelectorAll(".section")
        .forEach(element => {

            element
                .classList
                .remove(
                    "active-section"
                );

        });


    $(section)
        .classList
        .add("active-section");


    document
        .querySelectorAll(".menu-item")
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.section ===
                section
            );

        });


    if (section === "dashboard") {

        $("page-title").textContent =
            "Dashboard";

    }

    else if (
        section === "lancamentos"
    ) {

        $("page-title").textContent =
            "Lançamentos";

    }

    else if (section === "fluxo-caixa") {

        $("page-title").textContent =
            "Fluxo de caixa";

    }

    else {

        $("page-title").textContent =
            "Categorias";

    }

}


/* EVENTOS */

$("transactions-table").addEventListener("click", event => {
    const editButton = event.target.closest("button[data-edit-transaction]");
    if (!editButton) return;
    const transactionId = editButton.dataset.editTransaction;
    const transaction = transactions.find(item => String(item.id) === transactionId);
    if (!transaction) {
        alert("Esse lançamento não foi encontrado. Atualize a página e tente novamente.");
        return;
    }
    openModal(transaction);
});

$("value").addEventListener("input", event => {
    const digits = event.target.value.replace(/\D/g, "");
    event.target.value = digits ? money(Number(digits) / 100) : "";
});

$("cashflow-table").addEventListener("click", event => {
    const button = event.target.closest("[data-transaction-id]");
    if (!button) return;
    const transaction = transactions.find(item => item.id === button.dataset.transactionId);
    if (!transaction) return;
    transaction.status = transaction.status === "pending" ? "confirmed" : "pending";
    save();
    renderAll();
});

$("new-category").addEventListener("click", () => openCategoryModal());
$("close-category-modal").addEventListener("click", closeCategoryModal);
$("category-modal").addEventListener("click", event => {
    if (event.target === $("category-modal")) closeCategoryModal();
});
$("category-form").addEventListener("submit", saveCategory);
$("categories-grid").addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const { action, name, type } = button.dataset;
    if (action === "edit") openCategoryModal({ name, type });
    if (action === "delete") deleteCategory(name, type);
});

document
    .querySelectorAll(".menu-item")
    .forEach(button => {

        button.addEventListener(
            "click",
            () =>
                switchSection(
                    button.dataset.section
                )
        );

    });


document
    .querySelectorAll("[data-go]")
    .forEach(button => {

        button.addEventListener(
            "click",
            () =>
                switchSection(
                    button.dataset.go
                )
        );

    });


$("new-launch")
    .addEventListener(
        "click",
        openModal
    );


$("new-launch-2")
    .addEventListener(
        "click",
        openModal
    );


$("close-modal")
    .addEventListener(
        "click",
        closeModal
    );


$("modal")
    .addEventListener(
        "click",
        event => {

            if (
                event.target ===
                $("modal")
            ) {

                closeModal();

            }

        }
    );


$("month-filter").value =
    currentMonth();


$("month-filter")
    .addEventListener(
        "change",
        renderDashboard
    );


$("clear-filter")
    .addEventListener(
        "click",
        () => {

            $("month-filter").value = "";

            renderDashboard();

        }
    );


document
    .querySelectorAll(
        'input[name="type"]'
    )
    .forEach(radio => {

        radio.addEventListener(
            "change",
            updateCategoryOptions
        );

    });


/* SALVAR LANÇAMENTO */

$("transaction-form")
    .addEventListener(
        "submit",
        event => {

            event.preventDefault();


            const type =
                document
                    .querySelector(
                        'input[name="type"]:checked'
                    )
                    .value;

            const numericValue = parseCurrencyInput($("value").value);
            if (numericValue <= 0) {
                alert("Informe um valor maior que zero.");
                return;
            }


            const transaction = {

                id: editingTransactionId || crypto.randomUUID(),

                description:
                    $("description")
                    .value
                    .trim(),

                value: numericValue,

                date:
                    $("date").value,

                category:
                    $("category").value,

                type,

                note:
                    $("note").value.trim(),

                status:
                    $("transaction-status").value

            };


            if (editingTransactionId) {
                transactions = transactions.map(item =>
                    item.id === editingTransactionId ? transaction : item
                );
            } else {
                transactions.push(transaction);
            }


            save();

            closeModal();

            renderAll();

        }
    );


/* INICIALIZAÇÃO */

$("date").value =
    today();


updateCategoryOptions();

renderAll();
