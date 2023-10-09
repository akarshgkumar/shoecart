$(function () {
  $(".addToCartButton").on("click", function () {
    console.log("add to cart button clicked");
    addToCart(this);
  });
  $(".removeFromCartButton").on("click", function () {
    console.log("remove from cart button clicked");
    removeFromCart(this);
  });
});

function addToCart(buttonElement) {
  console.log("on add to cart function");
  const productId = $(buttonElement).data("product-id");
  const productName = $(buttonElement).data("product-name");
  const productPrice = $(buttonElement).data("product-price");
  const productImage = $(buttonElement).data("product-image");

  $.ajax({
    type: "POST",
    url: "/add-to-cart",
    contentType: "application/json",
    data: JSON.stringify({
      productId,
      name: productName,
      price: productPrice,
      image: productImage,
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
  console.log('on remove from cart')

  $.ajax({
    type: "POST",
    url: "/remove-from-cart",
    contentType: "application/json",
    data: JSON.stringify({ productId }),
    success: function (data) {
      console.log('on ajax remove cart');
      if (data.success) {
        $(buttonElement).closest('tr').remove();
        $("#cart-count").text(data.cartItems);
      } else {
        alert("Failed to remove product from cart!");
      }
    },
  });
}
