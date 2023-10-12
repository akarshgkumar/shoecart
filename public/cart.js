function updateTotalAndSubtotal() {
  let total = 0;
  $(".shopping-summery tbody tr:not(:last-child)").each(function () {
    let subtotal = parseFloat(
      $(this).find(".product-subtotal span").text().replace("₹ ", "")
    );
    total += subtotal;
  });

  $(".cart_total_amount span").text(`₹ ${total.toFixed(2)}`);
  $(".cart_total_amount strong span").text(`₹ ${total.toFixed(2)}`);
}

$(function () {
  $(".removeFromCartButton").on("click", function () {
    removeFromCart(this);
  });
  $(".qty-up, .qty-down").on("click", function () {
    let $qtyContainer = $(this).closest(".detail-qty");
    let $qtyVal = $qtyContainer.find(".qty-val");
    let currentQty = parseInt($qtyVal.text());

    if (currentQty < 1) currentQty = 1;
    let productId = $qtyContainer.data("product-id");
    let price = parseFloat($qtyVal.data("product-price"));
    let newSubtotal = currentQty * price;

    $qtyVal.text(currentQty);

    $qtyContainer
      .closest("tr")
      .find(".product-subtotal span")
      .text(`₹ ${newSubtotal.toFixed(2)}`);

    $.ajax({
      type: "POST",
      url: "/update-cart-quantity",
      contentType: "application/json",
      data: JSON.stringify({ productId, quantity: currentQty }),
      success: function (data) {
        if (!data.success) {
          alert("Failed to update product quantity!");
        } else {
          $("#cart-count").text(data.cartItems);
          updateTotalAndSubtotal();
        }
      },
      error: function (error) {
        console.error("Error updating quantity:", error);
      },
    });
  });
});

function addToCart(btn, defaultSize) {
  const productId = $(btn).data("product-id");
  const selectedSize =
  $(".attr-size ul.list-filter li.active a").text() || defaultSize;
    console.log(selectedSize)
  const quantity = parseInt($(".detail-qty .qty-val").text()) || 1;

  $.ajax({
    url: "/add-to-cart",
    type: "POST",
    data: {
      productId: productId,
      size: selectedSize,
      quantity: quantity,
    },
    success: function (data) {
      if(data.success) {
        $("#cart-count").text(data.cartItems);
        updateTotalAndSubtotal();
      }
    },
  });
}

function removeFromCart(buttonElement) {
  const productId = $(buttonElement).data("product-id");

  $.ajax({
    type: "POST",
    url: "/remove-from-cart",
    contentType: "application/json",
    data: JSON.stringify({ productId }),
    success: function (data) {
      if (data.success) {
        if (data.success) {
          updateTotalAndSubtotal();
          $(buttonElement).closest("tr").remove();
          $("#cart-count").text(data.cartItems);
        } else {
          alert("Failed to remove product from cart!");
        }
      }
    },
  });
}
