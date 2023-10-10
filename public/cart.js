$(function () {
  $(".addToCartButton").on("click", function () {
    addToCart(this);
  });
  $(".removeFromCartButton").on("click", function () {
    removeFromCart(this);
  });
  $(".qty-up, .qty-down").on("click", function() {
    let $qtyContainer = $(this).closest(".detail-qty");
    let $qtyVal = $qtyContainer.find(".qty-val");
    let currentQty = parseInt($qtyVal.text());
    
    if (currentQty < 1) currentQty = 1;
    let productId = $qtyContainer.data("product-id");
    let price = parseFloat($qtyVal.data("product-price"));
    let newSubtotal = currentQty * price;

    $qtyVal.text(currentQty);
    
    $qtyContainer.closest('tr').find('.product-subtotal span').text(`₹ ${newSubtotal.toFixed(2)}`);

    $.ajax({
        type: "POST",
        url: "/update-cart-quantity",
        contentType: "application/json",
        data: JSON.stringify({ productId, quantity: currentQty }),
        success: function (data) {
            if (!data.success) {
                alert("Failed to update product quantity!");
            }
        },
        error: function(error) {
            console.error("Error updating quantity:", error);
        }
    });
});
});


function addToCart(buttonElement) {
  const productId = $(buttonElement).data("product-id");

  $.ajax({
    type: "POST",
    url: "/add-to-cart",
    contentType: "application/json",
    data: JSON.stringify({
      productId
    }),
    success: function (data) {
      if (data.success) {
        $("#cart-count").text(data.cartItems);
      } else {
        alert("Failed to add product to cart!");
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
          $(buttonElement).closest('tr').remove();
          $("#cart-count").text(data.cartItems);
        } else {
          alert("Failed to remove product from cart!");
        }
      }
    }
  });
}