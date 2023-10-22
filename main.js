import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();
// return functions
async function return_cookie_info(roblosecurity) {
    try {
        const information_request = await fetch(`https://ecsr.io/apisite/users/v1/users/authenticated`, {
            method: "GET",
            headers: {
                'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36`,
                'Cookie': `.ROBLOSECURITY=${roblosecurity}`
            }
        })

        const information_raw = await information_request.json();
        return { isValid: (typeof information_raw == "object" && information_raw.name && information_raw.id), username: information_raw.name, id: information_raw.id };
    } catch (err) {
        return { isValid: false };
    }
}

async function return_cookie_csrf(roblosecurity) {
    try {
        const csrf_request = await fetch("https://ecsr.io/apisite/catalog/v1/catalog/items/details", {
            method: "POST",
            body: { items: [{ itemType: 'Asset', id: 37445 }] },
            
            headers: {
                'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36`,
                'Cookie': `.ROBLOSECURITY=${roblosecurity}`
            }
        });

        const csrf4_token = csrf_request.headers.raw()['set-cookie'][0].split(';')[0].split('=')[1];
        const csrf4_firstpart = csrf4_token.split(".");
        const csrf4 = csrf4_firstpart[1];
    
        const base64_csrf4_decoded = JSON.parse(Buffer.from(csrf4, 'base64').toString('ascii'))
        return { generated: (typeof base64_csrf4_decoded == 'object' && typeof csrf4_token == 'string' && typeof base64_csrf4_decoded.csrf == 'string'), rbxcsrf4: csrf4_token, csrf: base64_csrf4_decoded.csrf };
    }
    catch (err) {
        return { generated: false };
    }
}

async function return_cookie_balance(roblosecurity) {
    try {
        const user_info = await return_cookie_info(roblosecurity);

        if (user_info.isValid) {
            const balance_request = await fetch(`https://ecsr.io/apisite/economy/v1/users/${user_info.id}/currency`, {
                method: "GET",
                headers: {
                    'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36`,
                    'Cookie': `.ROBLOSECURITY=${roblosecurity}`
                }
            });

            const balance_raw = await balance_request.json();
            return { passed: true, robux: balance_raw.robux, tickets: balance_raw.tickets };
        }
        else {
            return { passed: false };
        }
    } catch (err) {
        return { passed: false };
    }
}

// get functions
async function get_collectibles(amount, roblosecurity) {
    try {
        const limiteds_request = await fetch(`https://ecsr.io/apisite/catalog/v1/search/items?category=Collectibles&limit=${amount}&sortType=0`, {
            method: "GET",
            headers: {
                'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36`,
                'Cookie': `.ROBLOSECURITY=${roblosecurity}`
            }
        })

        const limiteds_raw = await limiteds_request.json();
        return { validList: (typeof limiteds_raw.data == "object" && limiteds_raw.data[0].id), list: limiteds_raw.data };
    } catch (err) {
        console.log(err)
        return { validList: false };
    }
}

async function get_asset_info(assetId, roblosecurity) {
    try {
        const csrf_request = await return_cookie_csrf(roblosecurity);

        if (csrf_request.generated) {
            const asset_request = await fetch(`https://ecsr.io/apisite/catalog/v1/catalog/items/details`, {
                method: "POST",
                body: JSON.stringify({ items: [{ itemType: 'Asset', id: assetId }] }),
                
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36`,
                    'Cookie': `.ROBLOSECURITY=${roblosecurity}; rbxcsrf4=${csrf_request.rbxcsrf4}`,
                    'X-Csrf-Token': csrf_request.csrf
                },

                json: {
                    items: [{ itemType: 'Asset', id: assetId }]
                },

                withCredentials: true
            });

            const asset_raw = await asset_request.json();
            return { obtained: (typeof asset_raw == 'object' && typeof asset_raw.data == 'object' && typeof asset_raw.data[0].id == 'number'), asset: asset_raw.data[0] }
        }

        return { obtained: false };
    } catch (e) {
        return { obtained: false };
    }
}

async function purchase_asset(assetId, expectedCurrency, expectedPrice, expectedSellerId, roblosecurity) {
    try {
        const csrf_request = await return_cookie_csrf(roblosecurity);

        if (csrf_request.generated) {
            const purchase_request = await fetch(`https://ecsr.io/apisite/economy/v1/purchases/products/${assetId}`, {
                method: "POST",

                body: JSON.stringify({ expectedCurrency: expectedCurrency, expectedPrice: expectedPrice, expectedSellerId: expectedSellerId, expectedAssetId: assetId }),

                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36`,
                    'Cookie': `.ROBLOSECURITY=${roblosecurity}; rbxcsrf4=${csrf_request.rbxcsrf4}`,
                    'X-Csrf-Token': csrf_request.csrf
                },

                json: {
                    expectedCurrency: expectedCurrency,
                    expectedPrice: expectedPrice,
                    expectedSellerId: expectedSellerId,
                    expectedAssetId: assetId
                },

                withCredentials: true
            })

            const purchase_raw = await purchase_request.json();
            return { success: (typeof purchase_raw === "object" && purchase_raw.purchased && purchase_raw.reason === "Success"), purchase_reason: purchase_raw.reason || purchase_raw.errors[0].message, purchase_info: purchase_raw };
        }

        return { success: false };
    } catch (err) {
        return { success: true };
    }
}

async function get_owned_asset(assetId, assetType, roblosecurity) {
    try {
        const account_info = await return_cookie_info(roblosecurity);

        if (account_info.isValid) {
            const inventory_request = await fetch(`https://ecsr.io/users/inventory/list-json?userId=${account_info.id}&assetTypeId=${assetType}&cursor=&itemsPerPage=50`, {
                method: "GET",
                headers: {
                    'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36`,
                    'Cookie': `.ROBLOSECURITY=${roblosecurity}`
                }
            })

            let isOwned = false;
            const inventory_raw = await inventory_request.json();

            inventory_raw.Data.Items.forEach((item) => {
                if (item.Item.AssetId === assetId) {
                    isOwned = true;
                }
            })

            return { owned: isOwned };
        }
    } catch (e) {
        return { owned: false };
    }
}

// Signals

console.log(`[sniper]: tool developed by cerealwithmilk <https://github.com/cerealwithmilk/ecsr.io>`);
console.log(`[sniper]: warning, this tool is completely free and open source, don't fall for scams.`);

setInterval(() => {
    return_cookie_info(process.env.ROBLOSECURITY).then(async (info) => {
        if (info.isValid) {
            console.log(`${Date.now()} [sniper]: scanning the site as ${info.username}`);

            const balance = await return_cookie_balance(process.env.ROBLOSECURITY);
            const collectibles = await get_collectibles(1, process.env.ROBLOSECURITY);

            if (balance.passed && collectibles.validList) {
                collectibles.list.forEach(async (collectible) => {
                    const collectible_request_data = await get_asset_info(collectible.id, process.env.ROBLOSECURITY);
                    const is_already_owned = await get_owned_asset(collectible.id, collectible_request_data.asset.assetType, process.env.ROBLOSECURITY);

                    if (!typeof is_already_owned === "object") return;
                    if (!typeof collectible_data === "object") return;
                    
                    const collectible_data = collectible_request_data.asset;

                    if (is_already_owned.owned) return;
                    if (!collectible_data.isForSale) return;

                    const robux_balance = collectible_data.price;
                    const tickets_price = collectible_data.priceTickets

                    if (balance.robux > robux_balance && typeof robux_balance === "number" && typeof robux_balance !== "undefined" && robux_balance !== null) {
                        purchase_asset(collectible.id, 1, robux_balance, collectible_data.creatorTargetId, process.env.ROBLOSECURITY).then((purchase) => {
                            if (purchase.success) {
                                console.log(`[sniper]: purchased ${collectible_data.name} (${collectible_data.id}) for ${robux_balance} robux`);
                            } else {
                                console.log(`[sniper]: failed to purchase ${collectible_data.name} (${collectible_data.id}) for ${robux_balance} robux due to "${purchase.purchase_reason}"`);
                            }
                        })
                    }

                    if (balance.tickets > tickets_price && typeof tickets_price === "number" && typeof tickets_price !== "undefined" && tickets_price !== null) {
                        purchase_asset(collectible.id, 2, tickets_price, collectible_data.creatorTargetId, process.env.ROBLOSECURITY).then((purchase) => {
                            if (purchase.success) {
                                console.log(`[sniper]: purchased ${collectible_data.asset.name} (${collectible_data.asset.id}) for ${robux_balance} tickets`);
                            } else {
                                console.log(`[sniper]: failed to purchase ${collectible_data.asset.name} (${collectible_data.asset.id}) for ${robux_balance} tickets due to "${purchase.purchase_reason}"`);
                            }
                        })
                    }
                })
            }
        }
    })
}, 3000);
